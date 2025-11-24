# WaveChat Backend

A production-ready backend for WaveChat, a WhatsApp-like real-time chat & calling application built with NestJS.

## 🚀 Tech Stack

- **NestJS** - Progressive Node.js framework
- **MongoDB** - Database with Mongoose ODM
- **Socket.IO** - Real-time WebSocket communication
- **WebRTC** - Signaling for voice/video calls
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File uploads
- **TypeScript** - Type safety

## 📁 Project Structure

```
src/
├── auth/              # Authentication module (JWT)
├── users/             # User management
├── conversations/     # Chat conversations
├── messages/          # Messages (REST + WebSocket)
├── calls/             # WebRTC signaling gateway
├── uploads/           # File upload handling
├── common/            # Shared utilities (guards, decorators)
└── config/            # Configuration files
```

## 🛠️ Installation

```bash
# Install dependencies
npm install
# or
yarn install
```

## ⚙️ Configuration

Create a `.env` file based on `.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/wavechat
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
```

## 🚦 Running the App

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## 📡 API Endpoints

### Authentication

- `POST /auth/register` - Register new user
  ```json
  {
    "username": "john_doe",
    "phoneNumber": "+1234567890",
    "password": "password123"
  }
  ```

- `POST /auth/login` - Login
  ```json
  {
    "username": "john_doe",
    "password": "password123"
  }
  ```

### Users

- `GET /users/me` - Get current user
- `GET /users/:id` - Get user by ID
- `GET /users/search?q=query` - Search users
- `PUT /users/profile` - Update profile
- `PUT /users/status` - Update status (online/offline/last_seen)

### Conversations

- `POST /conversations` - Create conversation
- `GET /conversations` - Get user's conversations
- `GET /conversations/:id` - Get conversation by ID

### Messages

- `POST /messages` - Send message
- `GET /messages/conversation/:conversationId` - Get messages
- `PUT /messages/:id/edit` - Edit message
- `DELETE /messages/:id` - Delete message
- `PUT /messages/:id/read` - Mark as read

### Uploads

- `POST /uploads/avatar` - Upload avatar image
- `POST /uploads/media` - Upload media file

## 🔌 WebSocket Events

### Messages Gateway (`/messages` namespace)

**Client → Server:**
- `message:send` - Send a message
- `message:read` - Mark message as read
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator

**Server → Client:**
- `message:receive` - Receive new message
- `message:read` - Message read confirmation
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `user:online` - User came online
- `user:offline` - User went offline

### Calls Gateway (`/calls` namespace)

**Client → Server:**
- `call:initiate` - Initiate a call
- `call:answer` - Answer a call
- `call:iceCandidate` - Send ICE candidate
- `call:reject` - Reject a call
- `call:end` - End a call

**Server → Client:**
- `call:initiate` - Incoming call
- `call:answer` - Call answered
- `call:iceCandidate` - ICE candidate received
- `call:reject` - Call rejected
- `call:end` - Call ended

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

For WebSocket connections, pass the token in the handshake:

```javascript
const socket = io('http://localhost:5000/messages', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

## 📦 Database Schemas

### User
```typescript
{
  username: string;
  phone: string;
  passwordHash: string;
  avatar?: string;
  about?: string;
  status: 'online' | 'offline' | 'last_seen';
  lastSeen?: Date;
}
```

### Conversation
```typescript
{
  participants: ObjectId[];
  lastMessage?: ObjectId;
  updatedAt: Date;
}
```

### Message
```typescript
{
  sender: ObjectId;
  conversationId: ObjectId;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file';
  readBy: ObjectId[];
  edited: boolean;
  deleted: boolean;
  createdAt: Date;
}
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📝 License

MIT
