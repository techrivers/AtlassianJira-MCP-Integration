import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  CogIcon,
  LinkIcon,
  KeyIcon,
  UserIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

function App() {
  const [formData, setFormData] = useState({
    jiraUrl: '',
    username: '',
    apiToken: '',
    projectKey: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [existingConfig, setExistingConfig] = useState(null);

  // Load existing configuration on component mount
  useEffect(() => {
    loadExistingConfig();
  }, []);

  const loadExistingConfig = async () => {
    try {
      const response = await axios.get('/api/load-config');
      if (response.data.success && response.data.config) {
        setExistingConfig(response.data.config);
        setFormData({
          jiraUrl: response.data.config.jiraUrl || '',
          username: response.data.config.username || '',
          apiToken: response.data.config.hasApiToken ? '' : '',
          projectKey: response.data.config.projectKey || ''
        });
        
        if (response.data.config.hasApiToken) {
          setMessage({
            type: 'info',
            text: `Existing configuration loaded from ${response.data.configPath}. API token is masked for security.`
          });
        }
      }
    } catch (error) {
      console.error('Error loading existing config:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear connection status when form changes
    if (connectionStatus) {
      setConnectionStatus(null);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.jiraUrl) {
      newErrors.jiraUrl = 'Jira URL is required';
    } else if (!formData.jiraUrl.match(/^https?:\/\/.+/)) {
      newErrors.jiraUrl = 'Please enter a valid URL starting with http:// or https://';
    }
    
    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (!formData.username.includes('@')) {
      newErrors.username = 'Please enter a valid email address';
    }
    
    if (!formData.apiToken) {
      newErrors.apiToken = 'API Token is required';
    } else if (formData.apiToken.length < 10) {
      newErrors.apiToken = 'API Token must be at least 10 characters long';
    }
    
    if (formData.projectKey && !/^[A-Z][A-Z0-9]*$/.test(formData.projectKey)) {
      newErrors.projectKey = 'Project key must start with a letter and contain only uppercase letters and numbers';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const testConnection = async () => {
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fix the validation errors before testing the connection.' });
      return;
    }

    setTesting(true);
    setConnectionStatus(null);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post('/api/test-connection', formData);
      
      if (response.data.success) {
        setConnectionStatus({
          success: true,
          message: response.data.message,
          userInfo: response.data.userInfo
        });
        setMessage({ type: 'success', text: response.data.message });
      } else {
        setConnectionStatus({
          success: false,
          message: response.data.message
        });
        setMessage({ type: 'error', text: response.data.message });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Connection test failed';
      setConnectionStatus({
        success: false,
        message: errorMessage
      });
      setMessage({ type: 'error', text: errorMessage });
      
      if (error.response?.data?.errors) {
        const fieldErrors = {};
        error.response.data.errors.forEach(err => {
          fieldErrors[err.field] = err.message;
        });
        setErrors(fieldErrors);
      }
    } finally {
      setTesting(false);
    }
  };

  const saveConfiguration = async () => {
    if (!connectionStatus?.success) {
      setMessage({ type: 'error', text: 'Please test the connection successfully before saving.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post('/api/save-config', formData);
      
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Configuration saved successfully to ${response.data.configPath}!` 
        });
        
        // Reload the existing config to show the updated state
        setTimeout(() => {
          loadExistingConfig();
        }, 1000);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to save configuration';
      setMessage({ type: 'error', text: errorMessage });
      
      if (error.response?.data?.errors) {
        const fieldErrors = {};
        error.response.data.errors.forEach(err => {
          fieldErrors[err.field] = err.message;
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      jiraUrl: '',
      username: '',
      apiToken: '',
      projectKey: ''
    });
    setErrors({});
    setMessage({ type: '', text: '' });
    setConnectionStatus(null);
    setExistingConfig(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <CogIcon className="mx-auto h-12 w-12 text-jira-500" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Jira MCP Configuration
          </h1>
          <p className="mt-2 text-gray-600">
            Configure your Jira connection for the MCP server
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          {/* Success/Error Messages */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg flex items-start space-x-3 ${
              message.type === 'success' ? 'bg-green-50 border border-green-200' :
              message.type === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <ExclamationTriangleIcon className={`h-5 w-5 mt-0.5 ${
                  message.type === 'error' ? 'text-red-500' : 'text-blue-500'
                }`} />
              )}
              <p className={`text-sm ${
                message.type === 'success' ? 'text-green-700' :
                message.type === 'error' ? 'text-red-700' :
                'text-blue-700'
              }`}>
                {message.text}
              </p>
            </div>
          )}

          <form className="space-y-6">
            {/* Jira URL */}
            <div>
              <label htmlFor="jiraUrl" className="block text-sm font-medium text-gray-700 mb-1">
                <LinkIcon className="inline h-4 w-4 mr-1" />
                Jira URL *
              </label>
              <input
                type="url"
                id="jiraUrl"
                name="jiraUrl"
                value={formData.jiraUrl}
                onChange={handleInputChange}
                placeholder="https://your-company.atlassian.net"
                className={`input-field ${errors.jiraUrl ? 'input-error' : ''}`}
                required
              />
              {errors.jiraUrl && <p className="error-text">{errors.jiraUrl}</p>}
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                <UserIcon className="inline h-4 w-4 mr-1" />
                Username (Email) *
              </label>
              <input
                type="email"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="your-email@company.com"
                className={`input-field ${errors.username ? 'input-error' : ''}`}
                required
              />
              {errors.username && <p className="error-text">{errors.username}</p>}
            </div>

            {/* API Token */}
            <div>
              <label htmlFor="apiToken" className="block text-sm font-medium text-gray-700 mb-1">
                <KeyIcon className="inline h-4 w-4 mr-1" />
                API Token *
              </label>
              <input
                type="password"
                id="apiToken"
                name="apiToken"
                value={formData.apiToken}
                onChange={handleInputChange}
                placeholder={existingConfig?.hasApiToken ? "Enter new API token to update" : "Your Atlassian API token"}
                className={`input-field ${errors.apiToken ? 'input-error' : ''}`}
                required
              />
              {errors.apiToken && <p className="error-text">{errors.apiToken}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Get your API token from{' '}
                <a 
                  href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-jira-500 hover:text-jira-600"
                >
                  Atlassian Account Settings
                </a>
              </p>
            </div>

            {/* Project Key */}
            <div>
              <label htmlFor="projectKey" className="block text-sm font-medium text-gray-700 mb-1">
                <BuildingOfficeIcon className="inline h-4 w-4 mr-1" />
                Default Project Key (Optional)
              </label>
              <input
                type="text"
                id="projectKey"
                name="projectKey"
                value={formData.projectKey}
                onChange={handleInputChange}
                placeholder="PROJ"
                className={`input-field ${errors.projectKey ? 'input-error' : ''}`}
                style={{ textTransform: 'uppercase' }}
              />
              {errors.projectKey && <p className="error-text">{errors.projectKey}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Optional default project key for creating issues
              </p>
            </div>

            {/* Connection Status */}
            {connectionStatus && (
              <div className={`p-4 rounded-lg border ${
                connectionStatus.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start space-x-3">
                  {connectionStatus.success ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      connectionStatus.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {connectionStatus.success ? 'Connection Successful!' : 'Connection Failed'}
                    </p>
                    <p className={`text-sm mt-1 ${
                      connectionStatus.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {connectionStatus.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={testConnection}
                disabled={testing}
                className="btn-secondary flex-1 flex items-center justify-center space-x-2"
              >
                {testing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={saveConfiguration}
                disabled={loading || !connectionStatus?.success}
                className="btn-primary flex-1 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CogIcon className="h-4 w-4" />
                    <span>Save Configuration</span>
                  </>
                )}
              </button>
            </div>

            {/* Reset Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="w-full text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                Reset Form
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Configuration will be saved to your home directory as <code>.jira-mcp.env</code></p>
          <p className="mt-1">This tool helps set up your Jira MCP server environment variables.</p>
        </div>
      </div>
    </div>
  );
}

export default App;