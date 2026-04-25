<div align="center">

<img src="https://img.shields.io/badge/MowaChat-v2.0.4-a855f7?style=for-the-badge&logoColor=white" />

# 💬 MowaChat

### A full-stack real-time social messaging platform

*Stories · Direct Messages · Group Chats · Voice Messages · Live Notifications*

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?style=flat-square&logo=socket.io)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-5-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## ✨ Features

### 📸 Stories
- Upload **image, video, text, and voice** stories
- Auto-expire after **24 hours** (MongoDB TTL)
- Real-time viewer tracking & live reaction bar (8 emoji)
- Reply to stories directly into DMs
- Explore page for discovering public stories
- Progress bar with pause/resume on hold

### 💬 Messaging
- **Direct Messages** and **Group Chats**
- Rich media: images, videos, files, and **voice messages** with waveform
- Reply to specific messages with preview
- Delete for me / **Unsend for everyone**
- Emoji reactions with optimistic UI
- In-chat **search** across message history
- Camera capture directly from chat
- File preview modal with multi-file support

### 🔔 Real-time Engine
- Live **typing indicators**
- Online presence with **last seen** privacy controls
- **Read receipts** (respects recipient privacy settings)
- Instant message delivery via WebSocket
- Browser **push notifications** (opt-in)

### 🔒 Privacy & Security
- Public / **Private accounts**
- Block / unblock users
- Last seen visibility: Everyone / Followers / Nobody
- Read receipts on/off toggle
- JWT authentication with **Redis token blacklist**
- Per-conversation notification preferences

### 🎨 Customization
- Per-chat **accent color** override
- Custom **chat wallpapers** (upload or URL)
- Global **dark / light theme**
- Per-conversation settings reset

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│                  Client (Next.js)            │
│  React Query ──► UI Components ──► Socket.io │
└──────────────────────┬──────────────────────┘
                       │ HTTP + WebSocket
┌──────────────────────▼──────────────────────┐
│              Server (Express 5)              │
│  REST API  ──► Controllers ──► Socket.io     │
└────────┬──────────────────┬─────────────────┘
         │                  │
    ┌────▼────┐        ┌─────▼─────┐
    │ MongoDB │        │   Redis   │
    │  + TTL  │        │ (Online / │
    │ Indexes │        │  Tokens)  │
    └─────────┘        └───────────┘
                             │
                    ┌────────▼────────┐
                    │   Cloudinary    │
                    │ (Media Storage) │
                    └─────────────────┘
```

### Key Engineering Decisions
| Decision | Rationale |
|----------|-----------|
| **Socket.io Singleton** | Single persistent connection across route changes |
| **Redis Heartbeat** (20s) | Lightweight online presence without DB polling |
| **Optimistic UI** via React Query | Instant feedback, rollback on error |
| **JWT + Redis Blacklist** | Stateless auth with immediate logout capability |
| **MongoDB TTL Indexes** | Automatic story & notification expiry, zero cron jobs |
| **Cursor-based Pagination** | Stable infinite scroll without page-skip artifacts |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | App Router, SSR, routing |
| TypeScript | 5 | Type safety |
| TailwindCSS | 4 | Utility-first styling |
| TanStack React Query | 5 | Server state, caching, optimistic updates |
| Socket.io Client | 4.8 | Real-time bidirectional events |
| Framer Motion | 12 | Animations & transitions |
| Lucide React | 0.56 | Icon system |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 | Runtime |
| Express | 5 | REST API framework |
| Socket.io | 4.8 | WebSocket server |
| Mongoose | 9 | MongoDB ODM |
| Redis | 5 | Online presence, token blacklist |
| Cloudinary | 2 | Media storage & CDN |
| JWT | 9 | Authentication |
| Multer | 2 | File upload middleware |
| bcryptjs | 3 | Password hashing |

---

## 🚀 Getting Started

### Prerequisites
- Node.js **≥ 20.9.0**
- MongoDB Atlas or local instance
- Redis instance (local or cloud)
- Cloudinary account

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/mowachat.git
cd mowachat
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `.env`:
```env
SERVER_PORT=3000
DB_URI=mongodb+srv://...
JWT_SECRET=your_super_secret_key
REDIS_URL=redis://localhost:6379
CLOUD_NAME=your_cloudinary_name
CLOUD_API_KEY=your_cloudinary_key
CLOUD_API_SECRET=your_cloudinary_secret
CLIENT_URL=http://localhost:3001
```

```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

---

## 📁 Project Structure

```
mowachat/
├── backend/
│   └── src/
│       ├── config/          # Database connection
│       ├── controllers/     # Route handlers
│       │   ├── userController.js
│       │   ├── storyController.js
│       │   ├── conversationController.js
│       │   └── notificationController.js
│       ├── middlewares/     # Auth, file upload
│       ├── models/          # Mongoose schemas
│       │   ├── User.js
│       │   ├── Story.js
│       │   ├── Conversation.js
│       │   ├── Message.js
│       │   └── Notification.js
│       ├── routes/          # Express routers
│       ├── services/        # Cloudinary upload/delete
│       ├── socket/          # Socket.io event handlers
│       └── utils/           # JWT, Redis, AppError
│
└── frontend/
    ├── app/                 # Next.js App Router
    │   ├── (auth)/          # Login, Register
    │   └── (main)/          # Protected routes
    │       ├── messages/    # Chat pages
    │       ├── stories/     # Story viewer & feed
    │       ├── explore/     # Discover users
    │       ├── notifications/
    │       └── profile/     # Settings pages
    ├── components/
    │   ├── messages/        # Chat UI components
    │   ├── stories/         # Story UI components
    │   ├── modals/          # Reusable modals
    │   └── ui/              # Base UI components
    ├── hooks/               # Custom React hooks
    ├── lib/                 # API client, query keys
    └── types/               # TypeScript interfaces
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /user/register          Register new user
POST   /user/login             Login, returns JWT
POST   /user/logout            Blacklist token
POST   /user/auth              Verify token + get profile
```

### Stories
```
GET    /stories/feed           Following stories feed
GET    /stories/explore        Public stories grid
GET    /stories/:userId        User's stories
POST   /stories/upload         Create story (multipart)
POST   /stories/:id/view       Record a view
POST   /stories/:id/react      Toggle emoji reaction
DELETE /stories/delete/:id     Delete own story
```

### Conversations & Messages
```
GET    /api/conversations              List chats
POST   /api/conversations              Create / get DM
GET    /api/conversations/:id/messages Paginated messages
DELETE /api/conversations/:id          Delete for me
POST   /api/conversations/upload       Upload media
POST   /api/conversations/voice        Upload voice message
DELETE /api/conversations/messages/:id Delete / unsend
POST   /api/conversations/messages/:id/react Toggle reaction
```

### Notifications
```
GET    /api/notifications        Paginated notifications
PATCH  /api/notifications/read-all   Mark all read
PATCH  /api/notifications/:id/read   Mark one read
DELETE /api/notifications/:id        Delete one
```

### Users
```
GET    /user/explore            Search / suggest users
GET    /user/:id/profile        Get public profile
POST   /user/:id/follow         Toggle follow
GET    /user/:id/followers      Followers list
GET    /user/:id/following      Following list
PATCH  /user/update-profile     Update name/bio/photo
PATCH  /user/update-settings    Privacy & notifications
POST   /user/block/:id          Block user
POST   /user/unblock/:id        Unblock user
```

---

## 🔄 Socket Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join_conversation` | `{ conversationId }` | Subscribe to chat room |
| `send_message` | `{ conversationId, content, type, ... }` | Send a message |
| `typing` | `{ conversationId }` | Start typing indicator |
| `stop_typing` | `{ conversationId }` | Stop typing indicator |
| `mark_read` | `{ conversationId }` | Mark messages as read |
| `heartbeat` | — | Keep online status alive |
| `update_user_prefs` | — | Refresh privacy settings |

### Server → Client
| Event | Description |
|-------|-------------|
| `message_received` | New message in any chat |
| `messages_read` | Read receipt update |
| `user_typing` | Someone is typing |
| `user_stop_typing` | Stopped typing |
| `user_online` / `user_offline` | Presence change |
| `new_notification` | New notification |
| `new_viewer` | Story was viewed |
| `story_reaction` | Story got a reaction |
| `new_story` | Someone posted a story |
| `story_deleted` | Story was removed |
| `message_deleted` | Message unsent for everyone |
| `message_reaction` | Reaction on a message |
| `profile_update` | User updated their profile |
| `block_update` | Block/unblock event |
| `privacy_update` | Account privacy changed |

---

## 📊 Database Schema Highlights

### Story TTL
```js
storySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // 24h auto-delete
```

### Notification Dedup
```js
notificationSchema.index({ recipient: 1, sender: 1, type: 1, read: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 }); // 7d
```

### Message Performance
```js
messageSchema.index({ conversationId: 1, createdAt: -1 }); // Fast paginated fetch
```

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Commit: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feat/amazing-feature`
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">

**Built with ❤️ by Mohamed Hamad Swilam**

⭐ Star this repo if you found it helpful!

</div>