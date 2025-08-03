# 🩺 DiaWell: A Smart System for Diabetes Management through Motivation
By Team Catalyst

A comprehensive diabetes tracking and management platform built with React, Firebase, and modern web technologies. This app helps diabetic users track their meals, blood sugar levels, and connect with a supportive community.

## 🌟 Features

### 📊 Health Tracking
- **Smart Food Logging** - Extensive Indian food database with 1000+ items
- **Nutrition Calculation** - Automatic macro tracking (calories, carbs, protein, fat)
- **Blood Sugar Monitoring** - Track FBS and PPBS levels with progressive targets
- **Daily Progress Visualization** - Interactive circular meters and progress bars

### 🎯 Personalized Experience
- **Adaptive Diet Plans** - Personalized calorie and macro targets based on blood sugar levels
- **Progressive Target System** - Gradual improvement goals with 10% reduction methodology
- **Activity-Based Calculations** - Customized daily calorie needs based on activity level

### 🏆 Gamification & Community
- **Points System** - Earn points for logging meals and maintaining streaks
- **Streak Tracking** - Daily and longest streak monitoring
- **Community Leaderboard** - Compete with other users in a supportive environment
- **Forum System** - Share progress, recipes, tips, and support each other

### 💬 Community Features
- **Discussion Threads** - Create and participate in health-focused conversations
- **Category-Based Forums** - Progress sharing, recipes, support, Q&A, tips, and success stories
- **Like System** - Engage with community posts
- **Real-time Updates** - Live forum interactions

## 🛠️ Tech Stack

- **Frontend**: React 18, React Router DOM
- **Backend**: Firebase (Firestore, Authentication)
- **Styling**: CSS3 with modern designs and responsive layouts
- **State Management**: React Context API
- **Build Tool**: Vite
- **Date Handling**: date-fns
- **Authentication**: Firebase Auth

## 📱 Screenshots

### Dashboard
![Dashboard with nutrition tracking and progress meters]

### Food Logging
![Smart food search with Indian cuisine database]

### Community Forum
![Discussion threads and community interactions]

### Blood Sugar Tracking
![Progressive targets and blood sugar monitoring]

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase project with Firestore enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/diabetes-management-app.git
   cd diabetes-management-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   ```bash
   # Create a Firebase project at https://console.firebase.google.com
   # Enable Authentication and Firestore
   ```

4. **Environment Configuration**
   Create a `src/config/firebase.js` file:
   ```javascript
   import { initializeApp } from 'firebase/app';
   import { getFirestore } from 'firebase/firestore';
   import { getAuth } from 'firebase/auth';

   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-auth-domain",
     projectId: "your-project-id",
     storageBucket: "your-storage-bucket",
     messagingSenderId: "your-messaging-sender-id",
     appId: "your-app-id"
   };

   const app = initializeApp(firebaseConfig);
   export const db = getFirestore(app);
   export const auth = getAuth(app);
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
src/
├── components/           # Reusable React components
│   ├── FoodLogger/      # Food logging functionality
│   ├── Forum/           # Community forum components
│   ├── Leaderboard/     # Competition leaderboard
│   └── BloodSugarLogger/ # Blood sugar tracking
├── context/             # React Context providers
│   └── AuthContext.js   # Authentication context
├── pages/               # Main page components
│   ├── Dashboard.jsx    # Main dashboard
│   ├── Profile.jsx      # User profile management
│   └── Login.jsx        # Authentication pages
├── services/            # Business logic services
│   └── foodService.js   # Food database operations
├── utils/               # Utility functions
│   └── userUtils.js     # User and database operations
├── data/                # Static data files
│   └── foodDatabase.json # Indian food nutrition database
└── config/              # Configuration files
    └── firebase.js      # Firebase configuration
```

## 🔥 Firebase Collections

### Users Collection
```javascript
{
  displayName: "User Name",
  email: "user@example.com",
  hasProfile: true,
  currentPoints: 250,
  totalPoints: 1500,
  dailyStreak: 7,
  longestStreak: 30,
  // Health data
  height: 170,
  weight: 70,
  age: 30,
  gender: "male",
  dailyCalories: 1800,
  consumedCalories: 1200,
  consumedCarbs: 150,
  consumedProtein: 80,
  consumedFat: 45,
  // Blood sugar tracking
  currentFbs: 105,
  currentPpbs: 140,
  targetFbs: 100,
  targetPpbs: 140
}
```

### Forum Collections
- `forumThreads` - Discussion threads
- `forumReplies` - Thread replies
- `foodEntries` - Meal logging history
- `bloodSugarReadings` - Blood glucose history
- `leaderboard` - User rankings

## 🎯 Key Features Explained

### Progressive Target System
The app uses a unique progressive target system for blood sugar management:
- **10% Reduction Method**: Gradually reduces blood sugar targets by 10%
- **Adaptive Macros**: Adjusts carbohydrate, protein, and fat ratios based on current levels
- **Personalized Approach**: Considers individual health profiles and activity levels

### Indian Food Database
- **1000+ Food Items**: Comprehensive database of Indian cuisine
- **Complete Nutrition Data**: Calories, macros, fiber, sugar, sodium, vitamins, minerals
- **Smart Search**: Supports English and Hindi names with fuzzy matching
- **Diabetic-Friendly Suggestions**: Highlights low-sugar, high-fiber options

### Gamification System
- **Meal Logging Points**: 10-15 points per meal
- **Streak Bonuses**: Extra points for maintaining daily logging streaks
- **Community Competition**: Leaderboard system with rankings
- **Forum Participation**: Points for creating threads and replies

## 🔧 Configuration

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /forumThreads/{threadId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.uid == resource.data.authorId;
    }
    
    match /forumReplies/{replyId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.uid == resource.data.authorId;
    }
    
    match /foodEntries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    match /leaderboard/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Required Firestore Indexes
Create these composite indexes in your Firestore console:
1. `forumThreads`: `isPinned (desc), lastReplyAt (desc)`
2. `foodEntries`: `userId (asc), dateLogged (asc)`
3. `leaderboard`: `totalPoints (desc)`

## 🤝 Contributing

1. **Fork the project**
2. **Create your feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

## 📋 Development Guidelines

- Follow ES6+ syntax
- Use functional components with hooks
- Implement proper error handling
- Write responsive CSS
- Test all Firebase operations
- Maintain consistent code formatting

## 🐛 Known Issues

- Forum search requires manual refresh for new threads
- Some older browsers may have CSS compatibility issues
- Large food database may cause initial loading delays

## 🚧 Roadmap

- [ ] Mobile app development (React Native)
- [ ] Meal photo recognition with AI
- [ ] Integration with fitness trackers
- [ ] Medication reminders
- [ ] Advanced analytics dashboard

## 🙏 Acknowledgments

- Indian Food Nutrition Database contributors
- Firebase for backend infrastructure
- React community for excellent documentation
- Date-fns for date manipulation utilities
- All beta testers and community members

**⚠️ Disclaimer**: This application is for educational and informational purposes only. It is not intended to replace professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
