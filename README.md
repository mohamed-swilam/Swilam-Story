# Stories Feature Project

A full-stack social media feature that allows users to upload, view, and interact with stories, similar to Instagram or Snapchat.

## Table of Contents

- [Features](#features)  
- [Technologies](#technologies)  
- [Getting Started](#getting-started)  
- [API Endpoints](#api-endpoints)  
- [Folder Structure](#folder-structure)  
- [Screenshots](#screenshots)  
- [Technologies](#Technologies )  

## Features

- **User Authentication**: Register, login, and protected routes.  
- **Story Upload**: Users can upload images or videos as stories.  
- **Story Viewing**: Stories display with progress bars and swipe navigation.  
- **Viewers**: Track and show who viewed each story.  
- **Delete Story**: Users can delete their own stories.  
- **Responsive UI**: Fully responsive front-end with React & Tailwind CSS.  
- **Backend API**: Node.js + Express.js with MongoDB database.  
- **Cloud Storage**: Cloudinary for image/video storage.  

## Technologies

**Frontend:**
- React.js (Next.js App Router)  
- Tailwind CSS  
- TypeScript  

**Backend:**  
- Node.js & Express.js  
- MongoDB & Mongoose  
- Cloudinary  
- Multer for file uploads  

**Others:**  
- Axios for API calls  
- JWT Authentication  
- React Swipeable for story navigation  

## Getting Started

### Prerequisites

- Node.js >= 18  
- npm or yarn  
- MongoDB Atlas or local MongoDB  
- Cloudinary account  

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mohamed-swilam/Swilam-Story.git
cd Swilam-Story
```

2. Install dependencies for backend:

```
cd backend
npm install
```

3. Set up .env for backend:

```
PORT=3000
MONGO_URI=your_mongodb_uri
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_jwt_secret
```

4. Run backend:

```
npm run dev
```

5. Install dependencies for frontend:

```
cd ../frontend
npm install
npm run dev
```

6. Open browser at http://localhost:3000


## API Endpoints

### Authentication

#### Login

```http
POST /user/login
```

**Body:**

```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**

```json
{
  "token": "jwt_token_here"
}
```

#### Register

```http
POST /user/register
```

**Body:** FormData (includes username, password, profile picture, etc.)

**Response:**

```json
{
  "newUser": {
    "_id": "user_id",
    "username": "username",
    "password": "hashedPassrod"
    "user_pic": "profile_picture_url"
  }
}
```

### Stories

#### Get Feed

```http
GET /stories/feed
```

**Headers:**

```makefile
Authorization: <token>
```

**Response:**

```json
[
  {
    "storyOwner": "owner_id",
    "hasNewStory": true,
    "username": "user_name",
    "user_pic": "user_pic",
    "latestStoryDate": "latestStoryDate"
  }
]
```

#### Get User Stories

```http
GET /stories/:user_id
```

**Headers:**

```makefile
Authorization: <token>
```

**Response:** 
```json
[
    {
        "_id": "story_id",
        "storyOwner": {
            "_id": "owner_id",
            "username": "owner_name",
            "user_pic": "owner_pic"
        },
        "media_url": "story_url",
        "media_type": "story_file_type",
        "duration": 3,
        "public_id": "cloudinary_public_id",
        "createdAt": "date_of_create",
        "updatedAt": "date_of_update",
        "__v": 2,
        "viewersCount": 2,
        "mine": true
    },
]  
```

#### View Story

```http
POST /stories/:story_id/view
```

**Headers:**

```makefile
Authorization: <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Story viewed successfully"
}
```

#### Upload Story

```http
POST /stories/upload
```

**Headers:**

```makefile
Authorization: <token>
Content-Type: multipart/form-data
```

**Body:** FormData with file and optional fields

**Response:**

```json
{
    "_id": "story_id",
    "storyOwner": "owner_id",
    "media_url": "story_uel",
    "media_type": "story_file_type",
    "duration": 3,
    "public_id": "cloudinary_public_id",
    "viewers": [],
    "createdAt": "date_of_create",
    "updatedAt": "date_of_update",
    "__v": 0
}
```

#### Delete Story

```http
DELETE /stories/:story_id
```

**Headers:**

```makefile
Authorization: <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Story deleted successfully"
}
```


## Project Folder Structure

This document shows the full folder structure of the backend and frontend for the Social Stories project.

### Backend

```
backend/
│
├── node_modules/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── storyController.js
│   │   └── userController.js
│   ├── middlewares/
│   │   ├── auth.js
│   │   └── upload.js
│   ├── models/
│   │   ├── Story.js
│   │   └── User.js
│   ├── routes/
│   │   ├── storyRoute.js
│   │   └── userRoute.js
│   ├── services/
│   │   ├── cloudinaryDelete.js
│   │   └── cloudinaryUpload.js
│   ├── utils/
│   │   ├── appError.js
│   │   ├── cloudinary.js
│   │   └── redis.js
│   └── server.js
├── .env
├── package-lock.json
└── package.json
```

### Frontend

```
frontend/
│
├── .next/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   ├── not-found.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── stories/
│       ├── feed/page.tsx
│       ├── upload/page.tsx
│       └── [user_id]/page.tsx
├── components/
│   ├── ProtectedPage.tsx
│   └── stories/
│       ├── ProgressBar.tsx
│       ├── StoriesBar.tsx
│       ├── StoryHeader.tsx
│       ├── StoryMedia.tsx
│       └── ViewersModel.tsx
├── hooks/
│   └── useStories.ts
├── lib/
│   ├── api.ts
│   └── utils.ts
├── node_modules/
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── user_profile.jpg
│   ├── vercel.svg
│   └── window.svg
├── types/
│   └── stories.ts
├── components.json
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```


## License

This project is created with Mohamed Hamad Swilam.
