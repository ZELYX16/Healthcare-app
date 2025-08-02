import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

export const createUserDocument = async (user, additionalData = {}) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { email, displayName } = user;
    const createdAt = new Date();

    try {
      // Create user document
      await setDoc(userRef, {
        displayName,
        email,
        createdAt,
        hasProfile: false,
        currentPoints: 0,
        totalPoints: 0,
        dailyStreak: 0,
        longestStreak: 0,
        mealsLoggedToday: 0,
        lastMealDate: null,
        // Health-related fields
        height: null,
        weight: null,
        age: null,
        currentFbs: 100,
        currentPpbs: 140,
        dailyCalories: 1800,
        currentCalories:0,
        ...additionalData,
      });

      // Create corresponding leaderboard entry
      const leaderboardRef = doc(db, 'leaderboard', user.uid);
      await setDoc(leaderboardRef, {
        userId: user.uid,
        name: displayName || 'Anonymous',
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        joinDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });

      console.log('User document and leaderboard entry created successfully');
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  }
  return userRef;
};

export const getUserDocument = async (uid) => {
  if (!uid) return null;
  try {
    const userRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    console.error('Error fetching user document:', error);
    return null;
  }
};

export const checkUserProfile = async (uid) => {
  if (!uid) return false;
  try {
    const userRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);
    return snapshot.exists();
  } catch (error) {
    console.error('Error checking user profile:', error);
    return false;
  }
};

export const updateUserProfile = async (uid, profileData) => {
  if (!uid) return false;
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      ...profileData,
      hasProfile: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Update leaderboard entry with new name if it changed
    if (profileData.fullName || profileData.displayName) {
      const leaderboardRef = doc(db, 'leaderboard', uid);
      await setDoc(leaderboardRef, {
        name: profileData.fullName || profileData.displayName,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    }

    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
};

// Calculate daily macros based on user profile and blood sugar
export const calculateDailyMacros = (user, currentFbs = null, currentPpbs = null) => {
  const { dailyCalories = 1800, targetFbs = 100, targetPpbs = 140 } = user;
  
  const fbs = currentFbs || targetFbs;
  const ppbs = currentPpbs || targetPpbs;
  
  const devF = Math.max(0, (fbs - targetFbs) / 10);
  const devP = Math.max(0, (ppbs - targetPpbs) / 10);
  
  let carbPercent = 50 - (0.1 * devF) - (0.1 * devP);
  carbPercent = Math.max(30, Math.min(60, carbPercent));
  
  const carbPercentageLost = 50 - carbPercent;
  const proteinPercent = 20 + (carbPercentageLost * (20/50));
  const fatPercent = 30 + (carbPercentageLost * (30/50));
  
  return {
    targetCalories: dailyCalories,
    targetCarbs: Math.round((dailyCalories * carbPercent / 100) / 4 * 10) / 10,
    targetProtein: Math.round((dailyCalories * proteinPercent / 100) / 4 * 10) / 10,
    targetFat: Math.round((dailyCalories * fatPercent / 100) / 9 * 10) / 10,
    carbPercent: Math.round(carbPercent * 10) / 10,
    proteinPercent: Math.round(proteinPercent * 10) / 10,
    fatPercent: Math.round(fatPercent * 10) / 10,
  };
};

// Log food entry with points and streak calculation
export const logFoodEntry = async (uid, foodData) => {
  if (!uid) return false;
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get user data
    const user = await getUserDocument(uid);
    if (!user) throw new Error('User not found');

    // Get today's entries count
    const foodEntriesRef = collection(db, 'foodEntries');
    const todaysEntriesQuery = query(
      foodEntriesRef, 
      where('userId', '==', uid),
      where('dateLogged', '==', today)
    );
    const todaysSnapshot = await getDocs(todaysEntriesQuery);
    const mealsLoggedToday = todaysSnapshot.size;

    // Calculate points
    const mealBonuses = { breakfast: 15, lunch: 13, dinner: 13, snack: 12 };
    const basePoints = mealBonuses[foodData.mealType] || 10;
    const firstMealBonus = mealsLoggedToday === 0 ? 5 : 0;
    const pointsEarned = basePoints + firstMealBonus;

    // Create food entry
    const foodEntryRef = doc(collection(db, 'foodEntries'));
    await setDoc(foodEntryRef, {
      userId: uid,
      ...foodData,
      pointsEarned,
      dateLogged: today,
      createdAt: new Date().toISOString()
    });

    // Calculate new streak
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newMealsCount = mealsLoggedToday + 1;
    
    let newStreak = user.dailyStreak || 0;
    if (newMealsCount >= 2) {
      if (user.lastMealDate === yesterday) {
        newStreak += 1;
      } else if (user.lastMealDate !== today) {
        newStreak = 1;
      }
    }

    // Update user stats
    const newTotalPoints = (user.totalPoints || 0) + pointsEarned;
    const newCurrentPoints = (user.currentPoints || 0) + pointsEarned;
    const newLongestStreak = Math.max(user.longestStreak || 0, newStreak);

    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      currentPoints: newCurrentPoints,
      totalPoints: newTotalPoints,
      dailyStreak: newStreak,
      longestStreak: newLongestStreak,
      mealsLoggedToday: newMealsCount,
      lastMealDate: today,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Update leaderboard
    const leaderboardRef = doc(db, 'leaderboard', uid);
    await setDoc(leaderboardRef, {
      totalPoints: newTotalPoints,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastUpdated: new Date().toISOString()
    }, { merge: true });

    return {
      success: true,
      pointsEarned,
      newTotalPoints,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      mealsLoggedToday: newMealsCount
    };
  } catch (error) {
    console.error('Error logging food entry:', error);
    return { success: false, error: error.message };
  }
};

// Get daily food progress
export const getDailyProgress = async (uid, date = null) => {
  if (!uid) return null;
  
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Get user profile
    const user = await getUserDocument(uid);
    if (!user) return null;

    // Calculate macro targets
    const macroTargets = calculateDailyMacros(user);

    // Get daily macros
    const dailyMacrosRef = doc(db, 'dailyMacros', `${uid}_${targetDate}`);
    const dailyMacrosSnapshot = await getDoc(dailyMacrosRef);
    
    const consumed = dailyMacrosSnapshot.exists() ? dailyMacrosSnapshot.data() : {
      consumedCalories: 0,
      consumedCarbs: 0,
      consumedProtein: 0,
      consumedFat: 0
    };

    // Get meals logged today
    const foodEntriesRef = collection(db, 'foodEntries');
    const mealsQuery = query(
      foodEntriesRef,
      where('userId', '==', uid),
      where('dateLogged', '==', targetDate),
      orderBy('createdAt', 'asc')
    );
    const mealsSnapshot = await getDocs(mealsQuery);
    
    const mealsLogged = [];
    mealsSnapshot.forEach(doc => {
      mealsLogged.push({ id: doc.id, ...doc.data() });
    });

    return {
      date: targetDate,
      targets: macroTargets,
      consumed,
      remaining: {
        calories: macroTargets.targetCalories - consumed.consumedCalories,
        carbs: macroTargets.targetCarbs - consumed.consumedCarbs,
        protein: macroTargets.targetProtein - consumed.consumedProtein,
        fat: macroTargets.targetFat - consumed.consumedFat
      },
      mealsLogged,
      streakInfo: {
        currentStreak: user.dailyStreak || 0,
        longestStreak: user.longestStreak || 0,
        mealsLoggedToday: mealsLogged.length,
        streakGoalMet: mealsLogged.length >= 2
      }
    };
  } catch (error) {
    console.error('Error getting daily progress:', error);
    return null;
  }
};

// Update daily macros consumption
export const updateDailyMacros = async (uid, nutritionData, date = null) => {
  if (!uid) return false;
  
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const docId = `${uid}_${targetDate}`;
    
    // Get current daily macros
    const dailyMacrosRef = doc(db, 'dailyMacros', docId);
    const snapshot = await getDoc(dailyMacrosRef);
    
    const currentData = snapshot.exists() ? snapshot.data() : {
      consumedCalories: 0,
      consumedCarbs: 0,
      consumedProtein: 0,
      consumedFat: 0
    };

    // Update with new nutrition data
    const updatedData = {
      userId: uid,
      date: targetDate,
      consumedCalories: currentData.consumedCalories + nutritionData.calories,
      consumedCarbs: currentData.consumedCarbs + nutritionData.carbs,
      consumedProtein: currentData.consumedProtein + nutritionData.protein,
      consumedFat: currentData.consumedFat + nutritionData.fat,
      updatedAt: new Date().toISOString()
    };

    await setDoc(dailyMacrosRef, updatedData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating daily macros:', error);
    return false;
  }
};

// Get leaderboard
export const getLeaderboard = async (limitCount = 20) => {
  try {
    const leaderboardRef = collection(db, 'leaderboard');
    const leaderboardQuery = query(
      leaderboardRef,
      orderBy('totalPoints', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(leaderboardQuery);
    const leaderboard = [];
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      leaderboard.push({
        rank: index + 1,
        userId: data.userId,
        name: data.name,
        totalPoints: data.totalPoints || 0,
        currentStreak: data.currentStreak || 0,
        longestStreak: data.longestStreak || 0
      });
    });
    
    return leaderboard;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
};

// Submit monthly blood sugar results
export const submitMonthlyProgress = async (uid, finalFbs, finalPpbs) => {
  if (!uid) return false;
  
  try {
    const user = await getUserDocument(uid);
    if (!user || !user.initialBloodSugar) {
      throw new Error('Initial blood sugar data not found');
    }

    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    const initial = user.initialBloodSugar;
    const fbsImprovement = ((initial.fbs - finalFbs) / initial.fbs) * 100;
    const ppbsImprovement = ((initial.ppbs - finalPpbs) / initial.ppbs) * 100;
    const improvementPercentage = Math.round(((fbsImprovement + ppbsImprovement) / 2) * 100) / 100;

    const bonusPoints = Math.max(0, Math.floor(improvementPercentage * 10));

    // Save monthly progress
    const progressRef = doc(collection(db, 'monthlyProgress'));
    await setDoc(progressRef, {
      userId: uid,
      month,
      year,
      initialFbs: initial.fbs,
      initialPpbs: initial.ppbs,
      finalFbs,
      finalPpbs,
      improvementPercentage,
      pointsEarned: bonusPoints,
      createdAt: new Date().toISOString()
    });

    // Update user points
    const newTotalPoints = (user.totalPoints || 0) + bonusPoints;
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      totalPoints: newTotalPoints,
      currentPoints: (user.currentPoints || 0) + bonusPoints,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Update leaderboard
    const leaderboardRef = doc(db, 'leaderboard', uid);
    await setDoc(leaderboardRef, {
      totalPoints: newTotalPoints,
      lastUpdated: new Date().toISOString()
    }, { merge: true });

    return {
      success: true,
      improvementPercentage,
      bonusPointsEarned: bonusPoints,
      message: improvementPercentage > 0 
        ? `Congratulations! You improved by ${improvementPercentage}%`
        : 'Keep working towards your health goals!'
    };
  } catch (error) {
    console.error('Error submitting monthly progress:', error);
    return { success: false, error: error.message };
  }
};
