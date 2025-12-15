# Stories Feature Project

A full-stack social media feature that allows users to upload, view, and interact with stories, similar to Instagram or Snapchat.

## Table of Contents

- [Features](#features)  
- [Technologies](#technologies)  
- [Getting Started](#getting-started)  
- [API Endpoints](#api-endpoints)  
- [Folder Structure](#folder-structure)  
- [Screenshots](#screenshots)  
- [License](#license)  

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

```cd backend
npm install
```

3. Set up .env for backend:

```PORT=3000
MONGO_URI=your_mongodb_uri
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_jwt_secret
```

4. Run backend:

```npm run dev
```

5. Install dependencies for frontend:

```cd ../frontend
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
  "success": true,
  "user": {
    "id": "user_id",
    "username": "username",
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
Authorization: Bearer <token>
```

**Response:**

```json
[
  {
    "_id": "story_id",
    "storyOwner": {
      "username": "owner_name",
      "user_pic": "owner_pic_url"
    },
    "media_url": "url_to_media",
    "media_type": "image | video",
    "duration": 5,
    "viewers": [
      {
        "storyViewer": {
          "_id": "viewer_id",
          "username": "viewer_name",
          "user_pic": "viewer_pic_url"
        },
        "viewed_at": "2025-12-15T10:00:00Z"
      }
    ],
    "isViewed": false,
    "createdAt": "2025-12-15T09:00:00Z",
    "updatedAt": "2025-12-15T09:10:00Z"
  }
]
```

#### Get User Stories

```http
GET /stories/:user_id
```

**Headers:**

```makefile
Authorization: Bearer <token>
```

**Response:** Same structure as feed but only for the specific user.

#### View Story

```http
POST /stories/:story_id/view
```

**Headers:**

```makefile
Authorization: Bearer <token>
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
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:** FormData with file and optional fields

**Response:**

```json
{
  "success": true,
  "story": {
    "_id": "new_story_id",
    "storyOwner": {
      "username": "owner_name",
      "user_pic": "owner_pic_url"
    },
    "media_url": "uploaded_media_url",
    "media_type": "image | video",
    "duration": 5,
    "viewers": [],
    "isViewed": false,
    "createdAt": "2025-12-15T10:00:00Z",
    "updatedAt": "2025-12-15T10:00:00Z"
  }
}
```

#### Delete Story

```http
DELETE /stories/:story_id
```

**Headers:**

```makefile
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Story deleted successfully"
}
```

## Technologies Used

* Node.js
* Express.js
* MongoDB with Mongoose
* JWT Authentication
* Multer for file uploads

## Running Locally

1. Clone the repository:

```bash
git clone <repo_url>
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your database URL and JWT secret.
4. Run the server:

```bash
npm start
```

5. Test endpoints using Postman or similar tools.

## License

This project is licensed under the MIT License.
