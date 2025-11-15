# Map My Reads 🌍📚

A web application that visualizes your reading journey around the world. Upload your reading list from Goodreads or StoryGraph and see the countries you've explored through literature on an interactive world map.

## Features

- 📖 **CSV Import**: Support for Goodreads and StoryGraph exports
- 🗺️ **Interactive World Map**: Visualize your reading journey geographically
- 🔗 **Shareable Links**: Share your reading map with friends (24-hour expiry)
- 📱 **Responsive Design**: Works beautifully on desktop, tablet, and mobile
- 🎨 **Multiple Themes**: Choose from different map themes
- 💬 **Feedback System**: Easy feedback collection without login
- ☕ **Support**: Buy me a coffee to support the project

## Data Storage Strategy

### Current Implementation (No Login Required)

The application uses a **session-based storage strategy** that allows users to:

1. **Upload and Process**: Users upload their CSV files which are processed client-side
2. **Session Storage**: Processed book data is stored in browser sessionStorage with a unique session ID
3. **Shareable URLs**: Users can generate shareable links that encode their reading data
4. **Temporary Storage**: Sessions expire after 24 hours for privacy and storage management

### Storage Components

- **`lib/storage.ts`**: Core storage utilities for session management
- **`types/book.ts`**: TypeScript interfaces for book data
- **`components/ShareButton.tsx`**: URL generation and sharing functionality
- **`components/FeedbackButton.tsx`**: Feedback collection system

### Future Implementation (With User Accounts)

When users create accounts, the system will:

1. **Database Storage**: Migrate session data to persistent database storage
2. **User Profiles**: Store user information and reading history
3. **Enhanced Features**: Reading statistics, book recommendations, social features
4. **Data Migration**: Seamless transition from session to account-based storage

### Database Schema

The `prisma/schema.prisma` file defines the future database structure:

- **Users**: User accounts and profiles
- **Books**: Individual book records with geographic data
- **Sessions**: Temporary session storage for sharing
- **Feedback**: User feedback and feature requests

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Upload Your Reading List**:
   - Export your library from [Goodreads](https://www.goodreads.com/review/import) or [StoryGraph](https://app.thestorygraph.com/user-export)
   - Upload the CSV file to see your reading map

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Maps**: React Simple Maps with D3
- **CSV Parsing**: PapaParse
- **Database**: PostgreSQL with Prisma (future)

## Privacy & Data

- **No Login Required**: Users can use the app without creating accounts
- **Client-Side Processing**: CSV files are processed entirely in the browser
- **Temporary Storage**: Session data expires after 24 hours
- **No Data Collection**: User data is not stored on servers unless explicitly shared

## Contributing

This project is open to contributions! Areas for improvement:

- Enhanced country detection for books
- Additional CSV format support
- Reading statistics and analytics
- Social features and book recommendations
- Mobile app development

## Support

If you enjoy using Map My Reads, consider:
- 🌟 Starring this repository
- 💬 Providing feedback through the app
- ☕ [Buying me a coffee](https://buymeacoffee.com)

## License

MIT License - feel free to use this project for your own reading visualization needs! 