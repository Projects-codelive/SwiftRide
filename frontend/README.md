# Frontend Setup and Workflow

## Getting Started

1. **Install Dependencies:**  
   Open your terminal in the `frontend` directory and run:
   ```sh
   npm install
   ```

2. **Configure Environment Variables:**  
   Create a `.env` file in the `frontend` folder root with the following variables:
   ```env
   VITE_BASE_URL=http://localhost:4000
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```
   Replace `your_google_maps_api_key_here` with your actual Google Maps API key.

3. **Run the Development Server:**  
   Start the server by running:
   ```sh
   npm run dev
   ```
   Open the browser at the URL provided in the terminal (typically `http://localhost:3000`).

## Additional Workflow Commands

- **Lint the Code:**  
   To check for linting issues, run:
   ```sh
   npm run lint
   ```

- **Create a Production Build:**  
   Build the project for production with:
   ```sh
   npm run build
   ```

- **Preview Production Build:**  
   After building, preview the production build by running:
   ```sh
   npm run preview
   ```
   
...existing code...