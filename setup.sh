#!/bin/bash

# NYC Rental Platform Setup Script
echo "🏠 Setting up NYC Rental Platform..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your configuration."
fi

# Create backend .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend .env file..."
    cp .env.example backend/.env
    echo "✅ Backend .env file created."
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

# Start Docker containers
echo "🐳 Starting Docker containers..."
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Run database migrations
echo "🗄️ Running database migrations..."
cd backend && npx prisma db push && npx prisma generate && cd ..

# Start the development servers
echo "🚀 Starting development servers..."
docker-compose up -d

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:8000"
echo "📊 API Health: http://localhost:8000/api/health"
echo ""
echo "📖 Documentation:"
echo "   - README.md for detailed setup instructions"
echo "   - PROJECT_STATUS.md for feature overview"
echo ""
echo "🛠️ Development commands:"
echo "   - npm run dev (frontend)"
echo "   - cd backend && npm run dev (backend)"
echo "   - docker-compose logs -f (view logs)"
echo "   - docker-compose down (stop containers)"
echo ""
echo "🎉 Happy coding!"