# Loop Prototype

Loop is an intelligent crop advisory platform designed to help farmers optimize growth, detect diseases, and manage resources efficiently.

![App Screenshot](frontend/public/vite.svg) (*Replace with actual screenshot if available*)

## Features

- **Growth Planner**: Track crop stages and receive tailored advice based on GDD (Growing Degree Days).
- **Daily Advisory**: Get real-time irrigation and fertilizer recommendations.
- **Disease Detection**: Upload leaf images to identify potential diseases using AI.
- **Weather Forecast**: Localized weather data and 5-day forecasts.
- **Multilingual Support**: Switch between English and Hindi.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide React
- **Backend**: FastAPI, Python 3.11+
- **Deployment**: Render (Backend), Vercel/Netlify (Frontend - recommended)

## Setup Instructions

### Prerequisites
- Node.js & npm
- Python 3.11+
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/kush252/Loop_protoype.git
cd Loop_protoype
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```
Create a `.env` file in `backend/`:
```env
CORS_ORIGINS=http://localhost:5173
```
Run the server:
```bash
python main.py
# Server runs at http://localhost:8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```
Create a `.env` file in `frontend/`:
```env
VITE_API_URL=http://localhost:8000
```
Run the development server:
```bash
npm run dev
# App runs at http://localhost:5173
```

## Deployment

### Backend (Render)
This repository includes a `render.yaml` blueprint for easy deployment on Render.
1. Create a new **Blueprint** on Render.
2. Connect this repository.
3. It will auto-detect `render.yaml` and set up the service.

For manual steps, see `deployment.md` (if available in docs).

### Frontend
Deploy the `frontend/` directory to Vercel, Netlify, or Render Static Sites.
Ensure you set the Environment Variable:
`VITE_API_URL=https://your-backend-url.onrender.com`

## License
MIT
