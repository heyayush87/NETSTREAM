## PROJECT LINK 🔗🔗
https://netflix-gemini-4inx.vercel.app/

## 🍿 AI assistant features

The assistant (⌘/Ctrl+K) can show **where to watch** a movie (India-first, JustWatch data via TMDB), **identify a half-remembered movie** from a description (every candidate verified against TMDB), and run a **watch party**: it finds movies a whole group will enjoy and gives you a link where friends vote live. Architecture: [`docs/AGENT_ARCHITECTURE.md`](docs/AGENT_ARCHITECTURE.md).

### One-time Firebase setup for watch parties

1. **Enable Anonymous sign-in** so guests can vote without an account: Firebase console → Authentication → Sign-in method → **Anonymous** → Enable.
2. **Create the Firestore database**: Firebase console → Firestore Database → Create database (production mode).
3. **Deploy the rules**: `firebase deploy --only firestore:rules`
4. Hosting needs the SPA rewrite already in `firebase.json`, so `/party/:id` links open directly.

### Tests

```bash
npm test                 # React/Redux (Jest)
npm run test:gateway     # Cloudflare Worker (node --test)
npm run test:rules       # Firestore rules (needs Java 11+; downloads the emulator on first run)
```

## 🚀 TechStack 🚀

• React: Frontend framework for building user interfaces.  
• TMDB: Movie database for fetching movie details.  
• Firebase: Authentication and hosting platform.  
• Gemini Cloud AI: Movie recommendation engine.

## 🚀 𝐍𝐞𝐭𝐟𝐥𝐢𝐱-𝐆emini 𝐊𝐞𝐲 𝐅𝐞𝐚𝐭𝐮𝐫𝐞𝐬 🚀🚀

• **AI-Powered Recommendations**: NETSTREAM uses Gemini 1.5 flash to analyze your viewing history and preferences, delivering personalized movie recommendations based on factors like year, cast, genre, and more!

• **Sleek Design & User-Friendly**: Crafted with React and Tailwind CSS, NetflixGPT offers a stunning, intuitive interface that simplifies your movie search.

• **Efficient State Management**: Thanks to Redux Toolkit, our app is optimized for performance, ensuring a smooth and responsive experience.

• **Secure and Privacy First**: Firebase provides top-notch user authentication, while Protected Routes ensure your data remains private and secure.

• **Huge Movie Database**: With integration to TMDB, Gemini provides access to an extensive library of films from around the world.

• **Multi-Language Support**: Personalize your experience with language support for Hindi, English, and Spanish.


---

## Screenshots



### SIGNUP PAGE

![Signup Page](https://github.com/heyayush87/NETSTREAM/blob/5ce3604fbcb6c96b9d640b9584071ff36eec9ef6/Screenshot%202025-06-22%20181623.png)

### BROWSE PAGE

![Browse Page](https://github.com/heyayush87/NETSTREAM/blob/8075241fa9b1e7a8dd6a74b200026ca60a6ed7af/Screenshot%202025-06-22%20181543.png)

### MOVIE LIST

![Movie List](https://github.com/heyayush87/NETSTREAM/blob/9d4230f291950f34c57af5f9247c753f5fa23de4/Screenshot%202025-06-22%20181556.png)

### SEARCH PAGE


![Gemini Suggestion ](https://github.com/heyayush87/NETSTREAM/blob/f68c503694c51a67955801a03b3dd5c2d881b469/Screenshot%202025-06-22%20181610.png)


---

## Project Features Summary:

1. **User Interface**

   - Beautiful Header
   - Intuitive Movie Browsing Experience

2. **Core Features**

   - Main Movie Section (Trailer Background)
   - Movie Suggestions

3. **Implementation Highlights**
   - Authentication with Firebase
   - State Management with Redux Toolkit
   - API Integration with TMDB and OpenAI
