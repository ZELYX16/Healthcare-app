import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import foodService from '../services/foodService.js';


// Calculate daily calories using diabetic diet formula
export const calculateDailyCalories = (height, weight, age, gender, activityLevel = 'moderate', currentFbs = 100, currentPpbs = 140) => {
  // Step 1: Calculate Ideal Body Weight (IBW)
  const heightInMeters = height / 100;
  const ibw = 22 * Math.pow(heightInMeters, 2);
  
  // Step 2: Activity factors
  const activityFactors = {
    sedentary: 1.0,
    light: 1.2,
    moderate: 1.55,
    high: 1.725
  };
  
  // Step 3: Severity factor based on blood sugar
  let severityFactor = 1.0;
  if (currentFbs >= 180 || currentPpbs >= 250) {
    severityFactor = 0.85; // Poor control
  } else if (currentFbs >= 126 || currentPpbs >= 180) {
    severityFactor = 0.9; // Moderate control
  }
  
  // Step 4: Calculate daily calories
  const baseCalories = 25; // Using 25 for moderate weight management
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
    return { targetFbs: 100, targetPpbs: 140 }; // Default targets
  }

  // Define ideal/normal targets
  const idealFbs = 100;
  const idealPpbs = 140;
  
  // Use current values or initial values if current not provided
  const currentActualFbs = currentFbs || initialBloodSugar.fbs;
  const currentActualPpbs = currentPpbs || initialBloodSugar.ppbs;
  
  // Calculate target as 10% reduction from current values
  // This creates achievable, progressive goals
  const targetReductionPercent = 0.10; // 10% reduction
  
  const fbsReduction = currentActualFbs * targetReductionPercent;
  const ppbsReduction = currentActualPpbs * targetReductionPercent;
  
  // Calculate new targets (but don't go below ideal levels)
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
      // Create user document with default values
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
        activityLevel: 'moderate',
        currentFbs: 100,
        currentPpbs: 140,
        targetFbs: 100,
        targetPpbs: 140,
        dailyCalories: 1800, // Default, will be updated when profile is completed
        currentCalories: 0, // Will be calculated as weight * dailyCalories
        // Macro targets (will be calculated when profile is completed)
        targetCarbs: 0,
        targetProtein: 0,
        targetFat: 0,
        carbPercent: 50,
        proteinPercent: 20,
        fatPercent: 30,
        targetSetDate: null,
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
    // Calculate daily calories and macros if health data is provided
    let calculatedData = {};
    
    if (profileData.height && profileData.weight && profileData.age && profileData.gender) {
      const { height, weight, age, gender, activityLevel = 'moderate', currentFbs = 100, currentPpbs = 140 } = profileData;
      
      // Calculate daily calories using the diabetic formula
      const calorieData = calculateDailyCalories(height, weight, age, gender, activityLevel, currentFbs, currentPpbs);
      
      // Calculate currentCalories as product of dailyCalories and weight
      const currentCalories = 0;
      
      // Calculate progressive targets
      const progressiveTargets = calculateProgressiveTargets(
        { fbs: currentFbs, ppbs: currentPpbs }, 
        currentFbs, 
        currentPpbs
      );
      
      // Calculate macros based on progressive targets
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
export const calculateDailyMacros = (user, currentFbs = null, currentPpbs = null, targetFbs = null, targetPpbs = null) => {
  const { dailyCalories = 1800 } = user;
  
  // Use provided targets or calculate them from current readings
  let actualTargetFbs = targetFbs || user.targetFbs || 100;
  let actualTargetPpbs = targetPpbs || user.targetPpbs || 140;
  
  // If we have current readings but no specific targets, calculate 10% reduction targets
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
  
  // Calculate deviation factors using progressive targets
  const devF = Math.max(0, (fbs - actualTargetFbs) / 10);
  const devP = Math.max(0, (ppbs - actualTargetPpbs) / 10);
  
  // Adjust carb percentage based on blood sugar
  let carbPercent = 50 - (0.1 * devF) - (0.1 * devP);
  carbPercent = Math.max(30, Math.min(60, carbPercent));
  
  // Redistribute lost carb percentage to protein and fat
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
    // Include current progressive targets
    currentTargetFbs: actualTargetFbs,
    currentTargetPpbs: actualTargetPpbs,
  };
};

// Updated function to set and update progressive targets based on current readings
export const updateProgressiveTargetsFromCurrent = async (uid, currentFbs, currentPpbs) => {
  if (!uid) return false;
  
  try {
    const user = await getUserDocument(uid);
    if (!user) return false;

    // If no initial blood sugar recorded, set it as the baseline
    let initialBloodSugar = user.initialBloodSugar;
    if (!initialBloodSugar) {
      initialBloodSugar = {
        fbs: currentFbs,
        ppbs: currentPpbs,
        dateRecorded: new Date().toISOString()
      };
    }

    // Calculate new targets based on current readings (10% reduction)
    const progressiveTargets = calculateProgressiveTargets(
      initialBloodSugar, 
      currentFbs, 
      currentPpbs
    );

    // Update user document with new targets and current readings
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      initialBloodSugar, // Set if it wasn't already set
      currentFbs,
      currentPpbs,
      targetFbs: progressiveTargets.targetFbs,
      targetPpbs: progressiveTargets.targetPpbs,
      targetSetDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Recalculate and update macros with new targets
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

// Function to recalculate and update user macros
export const updateUserMacros = async (uid, currentFbs, currentPpbs, targetFbs = null, targetPpbs = null) => {
  if (!uid) return false;
  
  try {
    const user = await getUserDocument(uid);
    if (!user) return false;
    
    // Calculate progressive targets if not provided
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
    
    // Recalculate macros with progressive targets
    const macros = calculateDailyMacros(user, currentFbs, currentPpbs, actualTargetFbs, actualTargetPpbs);
    
    // Update user document with new values
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

// Function to update blood sugar readings and recalculate targets
export const logBloodSugarReading = async (uid, newFbs, newPpbs) => {
  if (!uid) return false;
  
  try {
    // Update progressive targets based on current readings
    const result = await updateProgressiveTargetsFromCurrent(uid, newFbs, newPpbs);
    
    if (result.success) {
      // Log the reading in a blood sugar history collection
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

// Log food entry with points and streak calculation
// Update your logFoodEntry function
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

    // Create food entry with calculated nutrition
    const foodEntryRef = doc(collection(db, 'foodEntries'));
    await setDoc(foodEntryRef, {
      userId: uid,
      ...nutritionData, // Use calculated nutrition instead of user input
      mealType: foodData.mealType,
      pointsEarned,
      dateLogged: today,
      createdAt: new Date().toISOString()
    });

    // Update daily macros with calculated nutrition
    await updateDailyMacros(uid, {
      calories: nutritionData.calories,
      carbs: nutritionData.carbs,
      protein: nutritionData.protein,
      fat: nutritionData.fat
    });

    // Rest of your existing logic...
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
      nutritionData // Return calculated nutrition for frontend display
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

    // Use stored macro targets from user profile
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
      },
      // Add progressive target info
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
    return updatedData;
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

    // Update user points and recalculate macros with new blood sugar values
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
