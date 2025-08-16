African Trade Dashboard: AI-Assisted Development Manual
This guide provides a structured, phased approach to building the African Trade Dashboard using an AI code assistant like Cursor. Each step is designed to build upon the last, ensuring a robust and well-organized final product.
________________________________________
Phase 1: Project Scaffolding and UI Foundation 🏗️
Goal: To establish the complete project structure and create the static user interface with full styling.
________________________________________
Step 1: Project Setup
Goal: Create the complete directory and file structure for the project.
Prompt:
"Please create the following directory and file structure for a new project called 'african-trade-dashboard', as specified in the project architecture overview:
african-trade-dashboard/
├── index.html
├── css/
│   ├── styles.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── data-manager.js
│   ├── map-renderer.js
│   ├── chart-renderer.js
│   └── utils.js
├── data/
│   ├── africa-countries.json
│   └── cache/
└── assets/
    └── icons/
Ensure all the files are empty for now."
Context:
•	This initial setup is based on the file structure defined in the "Project Architecture Overview" section of the african_trade_dashboard_guide (1).md file.
Rules:
•	Rule 1: The AI must create the exact directory and file structure as specified.
•	Rule 2: All created files must be empty.
Progress Check:
"Confirm that you have created the full directory structure and all the empty files as requested. Please list the created files and directories to verify the structure."
________________________________________
Step 2: HTML Structure
Goal: Populate the index.html file with the complete HTML structure for the dashboard.
Prompt:
"Please populate the index.html file with the HTML code provided in the 'Main HTML Template (index.html)' section of the implementation guide. This code sets up the entire structure for the African Trade Dashboard, including the header, KPI panel, map, trade routes list, and status panels."
Context:
•	You will use the full HTML code for index.html from the african_trade_dashboard_guide (1).md document. This includes the <head> section with links to the CSS files and the <body> containing all the dashboard's containers and elements.
Rules:
•	Rule 1: The AI must use the provided code exactly as it is.
•	Rule 2: The file must be saved as index.html in the root of the project directory.
Progress Check:
"Please confirm that index.html has been updated with the provided code. To verify, read the first 10 and last 10 lines of the file back to me."
________________________________________
Step 3: CSS Styling
Goal: Apply the visual styling to the dashboard by populating styles.css and responsive.css.
Part A: Main Styles
Prompt:
"Now, let's add the main styles. Please populate the css/styles.css file with the CSS code from the 'Main Dashboard Styles' section of the guide. This will define the dark theme, grid layout, panel styling, and animations."
Context:
•	The CSS code is located in the african_trade_dashboard_guide (1).md file under the "CSS Styling" section.
Rules:
•	Rule 1: The code must be placed in the css/styles.css file.
•	Rule 2: The AI should not modify the provided CSS code.
Progress Check:
"Confirm that css/styles.css is now populated. Report the total number of lines in the file and list the CSS variables (custom properties) defined at the root to verify it was copied correctly."
Part B: Responsive Styles
Prompt:
"Next, add the responsive styles. Please populate the css/responsive.css file with the CSS code from the 'Responsive Design' section of the guide to ensure the dashboard adapts to tablets and mobile devices."
Context:
•	The responsive CSS code is in the african_trade_dashboard_guide (1).md file.
Rules:
•	Rule 1: The code must be placed in the css/responsive.css file.
•	Rule 2: Do not modify the CSS code.
Progress Check:
"Confirm that css/responsive.css has been created and populated correctly. Read the media query for 'Tablet Styles' and 'Mobile Styles' back to me."
________________________________________
Phase 2: Core JavaScript Logic and Real Data Integration ⚙️
Goal: To implement the foundational JavaScript modules and integrate real-world data from external APIs.
________________________________________
Step 4: Utility Functions
Goal: Create the utility functions that will be used throughout the application.
Prompt:
"Let's start the JavaScript implementation with the utility functions. Create the content for js/utils.js using the code from the 'Utility Functions' section of the guide. This file will contain helper classes for number formatting, date manipulation, DOM interactions, and event handling."
Context:
•	The JavaScript code for utils.js is in the african_trade_dashboard_guide (1).md file.
Rules:
•	Rule 1: The code must be placed in the js/utils.js file.
•	Rule 2: Ensure all classes (NumberFormatter, DateUtils, DOMUtils, etc.) are included.
•	Rule 3: The final line, window.Utils = { ... };, must be included to make the utilities globally accessible.
Progress Check:
"Verify that the js/utils.js file has been populated. List the names of all the classes and the methods within the DOMUtils class defined in this file."
________________________________________
Step 5: Real Data Integration with TradeDataService
Goal: Implement the TradeDataService class to handle all API interactions for fetching real trade data.
Prompt:
"Now, we will implement the real data integration. Populate the js/data-manager.js file with the TradeDataService and DashboardDataManager classes from the data_integration_guide.js file. This service will manage fetching and processing data from the UN Comtrade, World Bank, and other APIs."
Context:
•	The complete code for this step is located in the data_integration_guide.js file.
•	This implementation will replace the mock data generation with live API calls.
•	The implementation_guide.md file provides additional context on API setup, rate limiting, and caching strategies that are implemented in the TradeDataService class.
Rules:
•	Rule 1: The code from data_integration_guide.js should be placed in js/data-manager.js.
•	Rule 2: The code includes two classes: TradeDataService and DashboardDataManager. Ensure both are copied correctly.
•	Rule 3: Note the API configurations at the top of the TradeDataService class. We will not be providing real API keys at this stage.
Progress Check:
"Confirm that js/data-manager.js now contains the TradeDataService and DashboardDataManager classes. To verify, please list the methods available in the TradeDataService class and the africanCountries object."
________________________________________
Phase 3: Application Controller and Final Integration 🚀
Goal: To create the main application controller and integrate all the modules to create a fully functional dashboard.
________________________________________
Step 6: Main Application Controller (app.js)
Goal: Implement the main application controller to manage the dashboard's state and user interactions.
Prompt:
"Now, create the main application controller. Populate js/app.js with the code for the AfricanTradeDashboard class from the implementation guide. This class will initialize the dashboard, set up event listeners, and coordinate the different modules."
Context:
•	The code for the AfricanTradeDashboard class is in the african_trade_dashboard_guide (1).md file.
•	At the end of the data_integration_guide.js file, there is an example of how to integrate the DashboardDataManager with the main dashboard class. We will now implement this integration.
Prompt for Integration:
"After pasting the AfricanTradeDashboard class into js/app.js, add the following code at the end of the file to initialize the dashboard and the data manager when the DOM is loaded:
JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    const dashboard = new AfricanTradeDashboard();
    const dataManager = new DashboardDataManager(dashboard);
    
    // Initialize with real data
    await dataManager.initialize();
    
    // Update dashboard's time slider handler to load real data
    dashboard.timeSlider.addEventListener('input', async (e) => {
        const year = parseInt(e.target.value);
        await dataManager.loadYearData(year);
        dashboard.currentYear = year;
        dashboard.yearDisplay.textContent = year;
    });
});
"
Rules:
•	Rule 1: The AfricanTradeDashboard class should be placed in js/app.js.
•	Rule 2: The DOMContentLoaded event listener must be added to the end of js/app.js to initialize the application.
Progress Check:
"Verify that js/app.js has been created with the AfricanTradeDashboard class and the DOMContentLoaded event listener. Read back the code inside the DOMContentLoaded event listener to confirm the integration."
________________________________________
This completes the development of the African Trade Dashboard. You now have a fully structured, styled, and functional application that integrates with real-world data APIs.

