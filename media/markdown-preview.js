// Acquire the VS Code API
const vscode = acquireVsCodeApi();

// Store state
let state = {
  scrollPosition: 0
};

// Initialize the webview
(function init() {
  // Get initial data passed from the extension
  const isDarkTheme = window.initialData?.isDarkTheme || 
                      document.body.classList.contains('vscode-dark') || 
                      document.body.classList.contains('vscode-high-contrast');
  
  // Process command links
  processCommandLinks();
  
  // Initialize mermaid with proper theme
  initializeMermaid(isDarkTheme);
  
  // Restore scroll position if available
  restoreScrollPosition();
  
  // Set up event listeners
  setupEventListeners();
  
  console.log("Preview initialized with theme:", isDarkTheme ? "dark" : "light");
})();

/**
 * Process command links in the document
 */
function processCommandLinks() {
  // Find all command links with href starting with command:
  document.querySelectorAll('a[href^="command:"]').forEach(link => {
    const commandUri = link.getAttribute('href');
    link.setAttribute('href', '#');
    link.setAttribute('class', 'command-link');
    link.setAttribute('data-command', commandUri);
    
    link.addEventListener('click', (e) => {
      e.preventDefault();
      console.log("Link clicked:", commandUri);
      
      if (commandUri.startsWith('command:youtrack.openInternalLink')) {
        try {
          const linkData = commandUri.substring(commandUri.indexOf('?') + 1);
          console.log("Parameter string:", linkData);
          
          vscode.postMessage({
            command: 'openLink',
            link: linkData
          });
        } catch(err) {
          console.error('Error processing link data:', err);
        }
      }
    });
  });
}

/**
 * Initialize Mermaid diagrams with theme awareness
 */
function initializeMermaid(isDarkTheme) {
  if (typeof mermaid !== 'undefined') {
    // Configure mermaid with the appropriate theme
    mermaid.initialize({ 
      startOnLoad: true, 
      theme: isDarkTheme ? 'dark' : 'default',
      logLevel: 'error',
      securityLevel: 'loose',
      flowchart: { 
        htmlLabels: true,
        curve: 'basis'
      },
      darkMode: isDarkTheme
    });
    
    // Force diagram theme attributes if in dark mode
    if (isDarkTheme) {
      document.querySelectorAll('.mermaid').forEach(diagram => {
        diagram.setAttribute('data-theme', 'dark');
      });
    }
    
    // Initialize after a small delay to ensure DOM is fully processed
    setTimeout(() => {
      try {
        mermaid.init(undefined, document.querySelectorAll('.mermaid'));
      } catch (error) {
        console.error("Error initializing Mermaid:", error);
      }
    }, 300);
  }
}

/**
 * Save current scroll position to state
 */
function saveScrollPosition() {
  const markdownBody = document.querySelector('.markdown-body');
  if (markdownBody) {
    state.scrollPosition = markdownBody.scrollTop;
    vscode.setState(state);
  }
}

/**
 * Restore previously saved scroll position
 */
function restoreScrollPosition() {
  const savedState = vscode.getState();
  if (savedState?.scrollPosition) {
    const markdownBody = document.querySelector('.markdown-body');
    if (markdownBody) {
      markdownBody.scrollTop = savedState.scrollPosition;
    }
    state = savedState;
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Save scroll position when scrolling
  const markdownBody = document.querySelector('.markdown-body');
  if (markdownBody) {
    markdownBody.addEventListener('scroll', () => {
      saveScrollPosition();
    });
  }
  
  // Listen for theme changes
  window.addEventListener('message', (event) => {
    const message = event.data;
    
    if (message.type === 'themeChanged') {
      // Re-render mermaid diagrams with the new theme
      const isDarkTheme = document.body.classList.contains('vscode-dark') || 
                         document.body.classList.contains('vscode-high-contrast');
      initializeMermaid(isDarkTheme);
    }
  });
}
