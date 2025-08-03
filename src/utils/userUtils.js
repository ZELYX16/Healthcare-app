import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import foodService from '../services/foodService.js';

// Calculate daily calories using diabetic diet formula
export const calculateDailyCalories = (height, weight, age, gender, activityLevel = 'moderate', currentFbs = 100, currentPpbs = 140) => {
  const heightInMeters = height / 100;
  const ibw = 22 * Math.pow(heightInMeters, 2);
  
  const activityFactors = {
    sedentary: 1.0,
    light: 1.2,
    moderate: 1.55,
    high: 1.725
  };
  
  let severityFactor = 1.0;
  if (currentFbs >= 180 || currentPpbs >= 250) {
    severityFactor = 0.85;
  } else if (currentFbs >= 126 || currentPpbs >= 180) {
    severityFactor = 0.9;
  } // Fixed: Added missing closing brace
  
  const baseCalories = 25;
  const dailyCalories = Math.round(ibw * baseCalories * activityFactors[activityLevel] * severityFactor);
  
  return {
    dailyCalories,
    ibw: Math.round(ibw * 10) / 10,
    severityFactor,
    activityFactor: activityFactors[activityLevel]
  };
};

// Calculate progressive targets based on percentage reduction from current blood sugar levels
export const calculateProgressiveTargets = (initialBloodSugar, currentFbs, currentPpbs, daysElapsed = 0) => {
  if (!initialBloodSugar || !initialBloodSugar.fbs || !initialBloodSugar.ppbs) {
    return { targetFbs: 100, targetPpbs: 140 };
  }

  const idealFbs = 100;
  const idealPpbs = 140;
  const currentActualFbs = currentFbs || initialBloodSugar.fbs;
  const currentActualPpbs = currentPpbs || initialBloodSugar.ppbs;
  const targetReductionPercent = 0.10;
  
  const fbsReduction = currentActualFbs * targetReductionPercent;
  const ppbsReduction = currentActualPpbs * targetReductionPercent;
  
  const targetFbs = Math.max(idealFbs, Math.round(currentActualFbs - fbsReduction));
  const targetPpbs = Math.max(idealPpbs, Math.round(currentActualPpbs - ppbsReduction));
  
  return {
    targetFbs,
    targetPpbs,
    reductionPercent: targetReductionPercent * 100,
    fbsReduction: Math.round(fbsReduction),
    ppbsReduction: Math.round(ppbsReduction),
    isAtIdealLevel: currentActualFbs <= idealFbs && currentActualPpbs <= idealPpbs
  };
};

export const createUserDocument = async (user, additionalData = {}) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { email, displayName } = user;
    const createdAt = new Date();

    try {
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
        gender: null,
        activityLevel: "moderate",
        currentFbs: 100,
        currentPpbs: 140,
        targetFbs: 100,
        targetPpbs: 140,
        dailyCalories: 1800,
        currentCalories: 0,
        // Macro targets
        targetCarbs: 0,
        targetProtein: 0,
        targetFat: 0,
        carbPercent: 50,
        proteinPercent: 20,
        fatPercent: 30,
        targetSetDate: null,
        // Daily consumed values (reset daily)
        consumedCalories: 0,
        consumedCarbs: 0,
        consumedProtein: 0,
        consumedFat: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
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
    let calculatedData = {};
    
    if (profileData.height && profileData.weight && profileData.age && profileData.gender) {
      const { height, weight, age, gender, activityLevel = 'moderate', currentFbs = 100, currentPpbs = 140 } = profileData;
      
      const calorieData = calculateDailyCalories(height, weight, age, gender, activityLevel, currentFbs, currentPpbs);
      const currentCalories = 0;
      
      const progressiveTargets = calculateProgressiveTargets(
        { fbs: currentFbs, ppbs: currentPpbs },
        currentFbs,
        currentPpbs
      );
      
      const macros = calculateDailyMacros({
        dailyCalories: calorieData.dailyCalories,
        targetFbs: progressiveTargets.targetFbs,
        targetPpbs: progressiveTargets.targetPpbs
      }, currentFbs, currentPpbs, progressiveTargets.targetFbs, progressiveTargets.targetPpbs);
      
      calculatedData = {
        dailyCalories: calorieData.dailyCalories,
        currentCalories: currentCalories,
        ibw: calorieData.ibw,
        targetFbs: progressiveTargets.targetFbs,
        targetPpbs: progressiveTargets.targetPpbs,
        targetCarbs: macros.targetCarbs,
        targetProtein: macros.targetProtein,
        targetFat: macros.targetFat,
        carbPercent: macros.carbPercent,
        proteinPercent: macros.proteinPercent,
        fatPercent: macros.fatPercent,
        initialBloodSugar: {
          fbs: currentFbs,
          ppbs: currentPpbs,
          dateRecorded: new Date().toISOString()
        },
        targetSetDate: new Date().toISOString(),
      };
    }

    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      ...profileData,
      ...calculatedData,
      hasProfile: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });

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
export const calculateDailyMacros = (user, currentFbs = null, currentPpbs = null, targetFbs = null, targetPpbs = null) => {
  const { dailyCalories = 1800 } = user;
  
  let actualTargetFbs = targetFbs || user.targetFbs || 100;
  let actualTargetPpbs = targetPpbs || user.targetPpbs || 140;
  
  if (!targetFbs && !targetPpbs && currentFbs && currentPpbs) {
    const progressiveTargets = calculateProgressiveTargets(
      user.initialBloodSugar,
      currentFbs,
      currentPpbs
    );
    actualTargetFbs = progressiveTargets.targetFbs;
    actualTargetPpbs = progressiveTargets.targetPpbs;
  }
  
  const fbs = currentFbs || user.currentFbs || actualTargetFbs;
  const ppbs = currentPpbs || user.currentPpbs || actualTargetPpbs;
  
  const devF = Math.max(0, (fbs - actualTargetFbs) / 10);
  const devP = Math.max(0, (ppbs - actualTargetPpbs) / 10);
  
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
    currentTargetFbs: actualTargetFbs,
    currentTargetPpbs: actualTargetPpbs,
  };
};

// Helper function to reset daily values if it's a new day
const resetDailyValuesIfNeeded = async (uid, user) => {
  const today = new Date().toISOString().split('T')[0];
  const lastResetDate = user.lastResetDate;
  
  if (lastResetDate !== today) {
    // Reset daily consumed values
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      consumedCalories: 0,
      consumedCarbs: 0,
      consumedProtein: 0,
      consumedFat: 0,
      mealsLoggedToday: 0,
      lastResetDate: today,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    return {
      ...user,
      consumedCalories: 0,
      consumedCarbs: 0,
      consumedProtein: 0,
      consumedFat: 0,
      mealsLoggedToday: 0,
      lastResetDate: today
    };
  }
  
  return user;
};

// Updated logFoodEntry function
export const logFoodEntry = async (uid, foodData) => {
  if (!uid) return false;
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get nutrition data from food database
    const nutritionData = foodService.calculateNutrition(
      foodData.foodName,
      foodData.quantity
    );
    
    if (!nutritionData) {
      return {
        success: false,
        error: 'Food not found in database. Please check the spelling or try a different name.'
      };
    }

    // Get user data and reset daily values if needed
    let user = await getUserDocument(uid);
    if (!user) throw new Error('User not found');
    
    user = await resetDailyValuesIfNeeded(uid, user);

    // Get today's entries count from the user document
    const mealsLoggedToday = user.mealsLoggedToday || 0;

    // Calculate points
    const mealBonuses = { breakfast: 15, lunch: 13, dinner: 13, snack: 12 };
    const basePoints = mealBonuses[foodData.mealType] || 10;
    const firstMealBonus = mealsLoggedToday === 0 ? 5 : 0;
    const pointsEarned = basePoints + firstMealBonus;

    // Create food entry with calculated nutrition
    const foodEntryRef = doc(collection(db, 'foodEntries'));
    await setDoc(foodEntryRef, {
      userId: uid,
      ...nutritionData,
      mealType: foodData.mealType,
      pointsEarned,
      dateLogged: today,
      createdAt: new Date().toISOString()
    });

    // Calculate streak
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

    const newTotalPoints = (user.totalPoints || 0) + pointsEarned;
    const newCurrentPoints = (user.currentPoints || 0) + pointsEarned;
    const newLongestStreak = Math.max(user.longestStreak || 0, newStreak);

    // Update user document with consumed values AND other stats
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      // Update consumed values
      consumedCalories: (user.consumedCalories || 0) + nutritionData.calories,
      consumedCarbs: (user.consumedCarbs || 0) + nutritionData.carbs,
      consumedProtein: (user.consumedProtein || 0) + nutritionData.protein,
      consumedFat: (user.consumedFat || 0) + nutritionData.fat,
      // Update game stats
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
      mealsLoggedToday: newMealsCount,
      nutritionData,
      // Return updated consumed values for immediate UI update
      updatedConsumed: {
        consumedCalories: (user.consumedCalories || 0) + nutritionData.calories,
        consumedCarbs: (user.consumedCarbs || 0) + nutritionData.carbs,
        consumedProtein: (user.consumedProtein || 0) + nutritionData.protein,
        consumedFat: (user.consumedFat || 0) + nutritionData.fat,
      }
    };
  } catch (error) {
    console.error('Error logging food entry:', error);
    return { success: false, error: error.message };
  }
};

// Simplified getDailyProgress - gets data directly from user document
export const getDailyProgress = async (uid, date = null) => {
  if (!uid) return null;
  
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Get user profile
    let user = await getUserDocument(uid);
    if (!user) return null;

    // Reset daily values if needed
    user = await resetDailyValuesIfNeeded(uid, user);

    // Get meals logged for the specific date
    const foodEntriesRef = collection(db, 'foodEntries');
    const mealsQuery = query(
      foodEntriesRef,
      where('userId', '==', uid),
      where('dateLogged', '==', targetDate)
    );
    const mealsSnapshot = await getDocs(mealsQuery);
    
    const mealsLogged = [];
    mealsSnapshot.forEach(doc => {
      mealsLogged.push({ id: doc.id, ...doc.data() });
    });

    // Sort by createdAt in JavaScript instead of Firestore to avoid index requirement
    mealsLogged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Use targets from user document
    const macroTargets = {
      targetCalories: user.dailyCalories || 1800,
      targetCarbs: user.targetCarbs || 0,
      targetProtein: user.targetProtein || 0,
      targetFat: user.targetFat || 0,
      carbPercent: user.carbPercent || 50,
      proteinPercent: user.proteinPercent || 20,
      fatPercent: user.fatPercent || 30,
      currentTargetFbs: user.targetFbs || 100,
      currentTargetPpbs: user.targetPpbs || 140
    };

    // Use consumed values from user document
    const consumed = {
      consumedCalories: user.consumedCalories || 0,
      consumedCarbs: user.consumedCarbs || 0,
      consumedProtein: user.consumedProtein || 0,
      consumedFat: user.consumedFat || 0
    };

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
        mealsLoggedToday: user.mealsLoggedToday || 0,
        streakGoalMet: (user.mealsLoggedToday || 0) >= 2
      },
      progressInfo: user.initialBloodSugar ? {
        initialFbs: user.initialBloodSugar.fbs,
        initialPpbs: user.initialBloodSugar.ppbs,
        currentTargetFbs: user.targetFbs,
        currentTargetPpbs: user.targetPpbs,
        currentFbs: user.currentFbs,
        currentPpbs: user.currentPpbs
      } : null
    };
  } catch (error) {
    console.error('Error getting daily progress:', error);
    return null;
  }
};

// Update progressive targets from current blood sugar readings
export const updateProgressiveTargetsFromCurrent = async (uid, currentFbs, currentPpbs) => {
  if (!uid) return false;
  
  try {
    const user = await getUserDocument(uid);
    if (!user) return false;

    let initialBloodSugar = user.initialBloodSugar;
    if (!initialBloodSugar) {
      initialBloodSugar = {
        fbs: currentFbs,
        ppbs: currentPpbs,
        dateRecorded: new Date().toISOString()
      };
    }

    const progressiveTargets = calculateProgressiveTargets(
      initialBloodSugar,
      currentFbs,
      currentPpbs
    );

    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      initialBloodSugar,
      currentFbs,
      currentPpbs,
      targetFbs: progressiveTargets.targetFbs,
      targetPpbs: progressiveTargets.targetPpbs,
      targetSetDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await updateUserMacros(uid, currentFbs, currentPpbs, progressiveTargets.targetFbs, progressiveTargets.targetPpbs);

    return {
      success: true,
      currentReadings: { fbs: currentFbs, ppbs: currentPpbs },
      newTargets: { fbs: progressiveTargets.targetFbs, ppbs: progressiveTargets.targetPpbs },
      reductionAmounts: {
        fbs: progressiveTargets.fbsReduction,
        ppbs: progressiveTargets.ppbsReduction
      },
      message: progressiveTargets.isAtIdealLevel
        ? 'Congratulations! You\'ve reached ideal blood sugar levels!'
        : `New targets set: FBS ${progressiveTargets.targetFbs} (${progressiveTargets.fbsReduction} reduction), PPBS ${progressiveTargets.targetPpbs} (${progressiveTargets.ppbsReduction} reduction)`
    };
  } catch (error) {
    console.error('Error updating progressive targets:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserMacros = async (uid, currentFbs, currentPpbs, targetFbs = null, targetPpbs = null) => {
  if (!uid) return false;
  
  try {
    const user = await getUserDocument(uid);
    if (!user) return false;
    
    let actualTargetFbs = targetFbs;
    let actualTargetPpbs = targetPpbs;
    
    if (!targetFbs || !targetPpbs) {
      const progressiveTargets = calculateProgressiveTargets(
        user.initialBloodSugar,
        currentFbs,
        currentPpbs
      );
      actualTargetFbs = progressiveTargets.targetFbs;
      actualTargetPpbs = progressiveTargets.targetPpbs;
    }
    
    const macros = calculateDailyMacros(user, currentFbs, currentPpbs, actualTargetFbs, actualTargetPpbs);
    
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      currentFbs,
      currentPpbs,
      targetFbs: actualTargetFbs,
      targetPpbs: actualTargetPpbs,
      targetCarbs: macros.targetCarbs,
      targetProtein: macros.targetProtein,
      targetFat: macros.targetFat,
      carbPercent: macros.carbPercent,
      proteinPercent: macros.proteinPercent,
      fatPercent: macros.fatPercent,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    return {
      ...macros,
      progressiveTargetsUpdated: true
    };
  } catch (error) {
    console.error('Error updating user macros:', error);
    return false;
  }
};

export const logBloodSugarReading = async (uid, newFbs, newPpbs) => {
  if (!uid) return false;
  
  try {
    const result = await updateProgressiveTargetsFromCurrent(uid, newFbs, newPpbs);
    
    if (result.success) {
      const readingRef = doc(collection(db, 'bloodSugarReadings'));
      await setDoc(readingRef, {
        userId: uid,
        fbs: newFbs,
        ppbs: newPpbs,
        targetFbs: result.newTargets.fbs,
        targetPpbs: result.newTargets.ppbs,
        dateRecorded: new Date().toISOString()
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error logging blood sugar reading:', error);
    return { success: false, error: error.message };
  }
};

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

    const newTotalPoints = (user.totalPoints || 0) + bonusPoints;
    const updatedMacros = await updateUserMacros(uid, finalFbs, finalPpbs);
    
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      totalPoints: newTotalPoints,
      currentPoints: (user.currentPoints || 0) + bonusPoints,
      currentFbs: finalFbs,
      currentPpbs: finalPpbs,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const leaderboardRef = doc(db, 'leaderboard', uid);
    await setDoc(leaderboardRef, {
      totalPoints: newTotalPoints,
      lastUpdated: new Date().toISOString()
    }, { merge: true });

    return {
      success: true,
      improvementPercentage,
      bonusPointsEarned: bonusPoints,
      updatedMacros,
      message: improvementPercentage > 0
        ? `Congratulations! You improved by ${improvementPercentage}%`
        : 'Keep working towards your health goals!'
    };
  } catch (error) {
    console.error('Error submitting monthly progress:', error);
    return { success: false, error: error.message };
  }
};

// FORUM FUNCTIONS

// Create a new forum thread
export const createForumThread = async (uid, threadData) => {
  if (!uid) {
    console.error('No user ID provided');
    return { success: false, error: 'User not authenticated' };
  }
  
  try {
    const user = await getUserDocument(uid);
    if (!user) {
      console.error('User document not found');
      throw new Error('User not found');
    }

    console.log('Creating thread with data:', threadData);

    // Create the thread document
    const threadRef = doc(collection(db, 'forumThreads'));
    const newThread = {
      id: threadRef.id,
      authorId: uid,
      authorName: user.fullName || user.displayName || 'Anonymous',
      title: threadData.title,
      content: threadData.content,
      category: threadData.category,
      tags: threadData.tags || [],
      replies: 0,
      views: 0,
      likes: 0,
      likedBy: [],
      isPinned: false,
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastReplyAt: new Date().toISOString(),
      lastReplyBy: user.fullName || user.displayName || 'Anonymous'
    };

    console.log('Writing thread to database:', newThread);

    // Write to Firestore
    await setDoc(threadRef, newThread);

    console.log('Thread created successfully with ID:', threadRef.id);

    // Award points for creating a thread
    const pointsEarned = 25;
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      currentPoints: (user.currentPoints || 0) + pointsEarned,
      totalPoints: (user.totalPoints || 0) + pointsEarned,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Update leaderboard
    const leaderboardRef = doc(db, 'leaderboard', uid);
    await setDoc(leaderboardRef, {
      totalPoints: (user.totalPoints || 0) + pointsEarned,
      lastUpdated: new Date().toISOString()
    }, { merge: true });

    console.log('Points awarded and leaderboard updated');

    return {
      success: true,
      threadId: threadRef.id,
      pointsEarned,
      thread: newThread
    };
  } catch (error) {
    console.error('Error creating forum thread:', error);
    return { success: false, error: error.message };
  }
};

// Reply to a forum thread
export const replyToThread = async (uid, threadId, replyContent) => {
  if (!uid || !threadId) return false;
  
  try {
    const user = await getUserDocument(uid);
    if (!user) throw new Error('User not found');

    // Create reply
    const replyRef = doc(collection(db, 'forumReplies'));
    const newReply = {
      id: replyRef.id,
      threadId,
      authorId: uid,
      authorName: user.fullName || user.displayName || 'Anonymous',
      content: replyContent,
      likes: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(replyRef, newReply);

    // Update thread reply count and last reply info
    const threadRef = doc(db, 'forumThreads', threadId);
    const threadDoc = await getDoc(threadRef);
    
    if (threadDoc.exists()) {
      const currentReplies = threadDoc.data().replies || 0;
      await setDoc(threadRef, {
        replies: currentReplies + 1,
        lastReplyAt: new Date().toISOString(),
        lastReplyBy: user.fullName || user.displayName || 'Anonymous',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    // Award points for replying
    const pointsEarned = 10;
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      currentPoints: (user.currentPoints || 0) + pointsEarned,
      totalPoints: (user.totalPoints || 0) + pointsEarned,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return { success: true, replyId: replyRef.id, pointsEarned };
  } catch (error) {
    console.error('Error replying to thread:', error);
    return { success: false, error: error.message };
  }
};

// Get forum threads with pagination
export const getForumThreads = async (category = null, limitCount = 20, lastDoc = null) => {
  try {
    const threadsRef = collection(db, 'forumThreads');
    let threadsQuery;

    if (category && category !== 'all') {
      threadsQuery = query(
        threadsRef,
        where('category', '==', category),
        orderBy('isPinned', 'desc'),
        orderBy('lastReplyAt', 'desc'),
        limit(limitCount)
      );
    } else {
      threadsQuery = query(
        threadsRef,
        orderBy('isPinned', 'desc'),
        orderBy('lastReplyAt', 'desc'),
        limit(limitCount)
      );
    }

    const snapshot = await getDocs(threadsQuery);
    const threads = [];
    
    snapshot.forEach(doc => {
      threads.push({ id: doc.id, ...doc.data() });
    });

    return threads;
  } catch (error) {
    console.error('Error fetching forum threads:', error);
    return [];
  }
};

// Get single thread with replies
export const getThreadWithReplies = async (threadId) => {
  if (!threadId) return null;
  
  try {
    // Get thread
    const threadRef = doc(db, 'forumThreads', threadId);
    const threadDoc = await getDoc(threadRef);
    
    if (!threadDoc.exists()) return null;
    
    const thread = { id: threadDoc.id, ...threadDoc.data() };

    // Update view count
    await setDoc(threadRef, {
      views: (thread.views || 0) + 1,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Get replies
    const repliesRef = collection(db, 'forumReplies');
    const repliesQuery = query(
      repliesRef,
      where('threadId', '==', threadId),
      orderBy('createdAt', 'asc')
    );
    
    const repliesSnapshot = await getDocs(repliesQuery);
    const replies = [];
    
    repliesSnapshot.forEach(doc => {
      replies.push({ id: doc.id, ...doc.data() });
    });

    return { thread, replies };
  } catch (error) {
    console.error('Error fetching thread with replies:', error);
    return null;
  }
};

// Like/Unlike thread or reply
export const toggleLike = async (uid, itemId, itemType) => {
  if (!uid || !itemId) return false;
  
  try {
    const user = await getUserDocument(uid);
    if (!user) throw new Error('User not found');

    const collectionName = itemType === 'thread' ? 'forumThreads' : 'forumReplies';
    const itemRef = doc(db, collectionName, itemId);
    const itemDoc = await getDoc(itemRef);
    
    if (!itemDoc.exists()) return false;

    const itemData = itemDoc.data();
    const likedBy = itemData.likedBy || [];
    const isLiked = likedBy.includes(uid);

    let newLikedBy, newLikes;
    
    if (isLiked) {
      // Unlike
      newLikedBy = likedBy.filter(id => id !== uid);
      newLikes = Math.max(0, (itemData.likes || 0) - 1);
    } else {
      // Like
      newLikedBy = [...likedBy, uid];
      newLikes = (itemData.likes || 0) + 1;
    }

    await setDoc(itemRef, {
      likes: newLikes,
      likedBy: newLikedBy,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return { success: true, isLiked: !isLiked, likes: newLikes };
  } catch (error) {
    console.error('Error toggling like:', error);
    return { success: false, error: error.message };
  }
};

// Search forum threads
export const searchForumThreads = async (searchTerm, limitCount = 20) => {
  if (!searchTerm) return [];
  
  try {
    const threadsRef = collection(db, 'forumThreads');
    const searchQuery = query(
      threadsRef,
      orderBy('title'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(searchQuery);
    const threads = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          data.content.toLowerCase().includes(searchTerm.toLowerCase())) {
        threads.push({ id: doc.id, ...data });
      }
    });

    return threads;
  } catch (error) {
    console.error('Error searching forum threads:', error);
    return [];
  }
};
