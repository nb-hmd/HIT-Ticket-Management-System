import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, AlertCircle, CheckCircle, File, Image, FileText, Trash2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';

interface Factory {
  id: string;
  name: string;
  description: string;
}

interface AttachedFile {
  id: string;
  file: File;
  preview?: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
  progress: number;
}

const TicketCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [factoriesLoading, setFactoriesLoading] = useState(true);
  const [factoriesError, setFactoriesError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    factory_id: ''
  });
  
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFactories();
  }, []);

  const fetchFactories = async () => {
    setFactoriesLoading(true);
    setFactoriesError('');
    
    try {
      console.log('🔄 Fetching factories with token:', token ? 'Present' : 'Missing');
      
      const response = await api.get('/users/factories/list');
      const data = await response.json();
      console.log('📡 Factory API response:', data);

      if (data.success) {
        setFactories(data.data);
        console.log('✅ Factories loaded successfully:', data.data.length);
      } else {
        console.error('❌ Factory API error:', data);
        
        // Fallback to mock factories if API fails
        const mockFactories = [
          { id: 'ARDIC', name: 'Armament Research & Development Center', description: 'Research and development facility' },
          { id: 'GUNFACTORY', name: 'Gun Factory', description: 'Artillery and weapons manufacturing' },
          { id: 'ASRC', name: 'Ammunition Storage and Refurbishment Center', description: 'Ammunition storage and maintenance' },
          { id: 'HRF', name: 'Heavy Rebuild Factory', description: 'Tank and vehicle rebuild operations' },
          { id: 'MVF', name: 'Military Vehicle Factory', description: 'Military vehicle manufacturing' },
          { id: 'HITEC', name: 'HIT Engineering Complex', description: 'Engineering and technical services' }
        ];
        
        setFactories(mockFactories);
        console.log('🔄 Using fallback factory data');
        
        setFactoriesError(data.message || 'Failed to load factories');
      }
    } catch (error) {
      console.error('❌ Network error fetching factories:', error);
      
      // Fallback to mock factories on network error
      const mockFactories = [
        { id: 'ARDIC', name: 'Armament Research & Development Center', description: 'Research and development facility' },
        { id: 'GUNFACTORY', name: 'Gun Factory', description: 'Artillery and weapons manufacturing' },
        { id: 'ASRC', name: 'Ammunition Storage and Refurbishment Center', description: 'Ammunition storage and maintenance' },
        { id: 'HRF', name: 'Heavy Rebuild Factory', description: 'Tank and vehicle rebuild operations' },
        { id: 'MVF', name: 'Military Vehicle Factory', description: 'Military vehicle manufacturing' },
        { id: 'HITEC', name: 'HIT Engineering Complex', description: 'Engineering and technical services' }
      ];
      
      setFactories(mockFactories);
      console.log('🔄 Using fallback factory data due to network error');
      setFactoriesError(error.message || 'Network error. Please try again.');
    } finally {
      setFactoriesLoading(false);
    }
  };

  // File handling functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported';
    }

    return null;
  };

  const generateFileId = (): string => {
    return Math.random().toString(36).substr(2, 9);
  };

  const createFilePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const addFiles = async (files: File[]) => {
    const newFiles: AttachedFile[] = [];

    for (const file of files) {
      const error = validateFile(file);
      const preview = await createFilePreview(file);
      
      const attachedFile: AttachedFile = {
        id: generateFileId(),
        file,
        preview,
        uploading: false,
        uploaded: false,
        error,
        progress: 0
      };

      newFiles.push(attachedFile);
    }

    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const uploadFile = async (attachedFile: AttachedFile, ticketId: string): Promise<boolean> => {
    const formData = new FormData();
    formData.append('file', attachedFile.file);

    try {
      // Update file status to uploading
      setAttachedFiles(prev => prev.map(f => 
        f.id === attachedFile.id 
          ? { ...f, uploading: true, error: undefined, progress: 0 }
          : f
      ));

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setAttachedFiles(prev => prev.map(f => {
          if (f.id === attachedFile.id && f.progress < 90) {
            return { ...f, progress: f.progress + 10 };
          }
          return f;
        }));
      }, 200);

      const response = await api.upload(`/upload/ticket/${ticketId}`, formData);
      const data = await response.json();
      
      clearInterval(progressInterval);
      
      if (data.success) {
        setAttachedFiles(prev => prev.map(f => 
          f.id === attachedFile.id 
            ? { ...f, uploading: false, uploaded: true, progress: 100 }
            : f
        ));
        return true;
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setAttachedFiles(prev => prev.map(f => 
        f.id === attachedFile.id 
          ? { ...f, uploading: false, error: errorMessage, progress: 0 }
          : f
      ));
      return false;
    }
  };

  const uploadAllFiles = async (ticketId: string): Promise<void> => {
    const filesToUpload = attachedFiles.filter(f => !f.uploaded && !f.error);
    
    if (filesToUpload.length === 0) return;

    const uploadPromises = filesToUpload.map(file => uploadFile(file, ticketId));
    await Promise.all(uploadPromises);
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.trim().length < 5) {
      errors.title = `Title must be at least 5 characters long (${formData.title.trim().length}/5)`;
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = `Description must be at least 10 characters long (${formData.description.trim().length}/10)`;
    }
    
    if (!formData.factory_id) {
      errors.factory_id = 'Please select a factory/department';
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setError('Please fix the validation errors before submitting');
      return;
    }

    // Check for file validation errors
    const hasFileErrors = attachedFiles.some(f => f.error);
    if (hasFileErrors) {
      setError('Please fix file errors before submitting');
      return;
    }

    setIsSubmitting(true);
     setError('');
     setSuccess('');

    try {
      // Create ticket first
      const response = await api.post('/tickets', formData);
      const data = await response.json();

      if (data.success) {
        const ticketId = data.data.id;
        
        // Upload files if any
        if (attachedFiles.length > 0) {
          await uploadAllFiles(ticketId);
        }
        
        setSuccess('Ticket created successfully!');
        setTimeout(() => {
          navigate(`/tickets/${ticketId}`);
        }, 1500);
      } else {
        setError(data.message || 'Failed to create ticket');
      }
    } catch (error) {
      setError(error.message || 'Network error. Please try again.');
    } finally {
       setIsSubmitting(false);
     }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Clear general error when user makes changes
    if (error) {
      setError('');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-green-500 bg-green-50';
      default: return 'border-gray-300';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Ticket</h1>
        <p className="text-gray-600 mt-1">
          Report an issue or request assistance from the support team.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title * (minimum 5 characters)
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Brief description of the issue (minimum 5 characters)"
              required
              disabled={loading}
            />
            
            {/* Character Counter and Validation */}
            <div className="mt-1 flex justify-between items-start">
              <div className="flex-1">
                {validationErrors.title ? (
                  <p className="text-red-500 text-sm flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {validationErrors.title}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Provide a clear, concise title for your issue.
                  </p>
                )}
              </div>
              <div className={`text-sm ml-2 ${
                formData.title.trim().length < 5 
                  ? 'text-red-500' 
                  : formData.title.trim().length >= 5 
                    ? 'text-green-600' 
                    : 'text-gray-500'
              }`}>
                {formData.title.trim().length}/5
              </div>
            </div>
          </div>

          {/* Factory Selection */}
          <div>
            <label htmlFor="factory_id" className="block text-sm font-medium text-gray-700 mb-2">
              Factory/Department *
            </label>
            <select
              id="factory_id"
              name="factory_id"
              value={formData.factory_id}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.factory_id ? 'border-red-500' : 'border-gray-300'
              }`}
              required
              disabled={loading || factoriesLoading}
            >
              <option value="">
                {factoriesLoading ? 'Loading factories...' : 'Select a factory/department'}
              </option>
              {factories.map((factory) => (
                <option key={factory.id} value={factory.id}>
                  {factory.name}
                </option>
              ))}
            </select>
            
            {validationErrors.factory_id && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {validationErrors.factory_id}
              </p>
            )}
            
            {factoriesError && (
              <div className="mt-1 flex items-center text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                {factoriesError}
                <button
                  type="button"
                  onClick={fetchFactories}
                  className="ml-2 text-blue-600 hover:text-blue-700 underline"
                >
                  Retry
                </button>
              </div>
            )}
            
            {factoriesLoading && (
              <div className="mt-1 text-sm text-gray-500">
                Loading available factories...
              </div>
            )}
            
            {!factoriesLoading && factories.length === 0 && !factoriesError && (
              <div className="mt-1 text-sm text-orange-600">
                No factories available. Please contact administrator.
              </div>
            )}
            
            {formData.factory_id && (
              <p className="mt-1 text-sm text-gray-600">
                {factories.find(f => f.id === formData.factory_id)?.description}
              </p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'low', label: 'Low', description: 'Minor issue, no urgency' },
                { value: 'medium', label: 'Medium', description: 'Standard issue' },
                { value: 'high', label: 'High', description: 'Important, needs attention' },
                { value: 'critical', label: 'Critical', description: 'Urgent, blocking work' }
              ].map((priority) => (
                <label
                  key={priority.value}
                  className={`relative flex flex-col p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.priority === priority.value
                      ? getPriorityColor(priority.value)
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={priority.value}
                    checked={formData.priority === priority.value}
                    onChange={handleInputChange}
                    className="sr-only"
                    disabled={loading}
                  />
                  <span className="font-medium text-sm">{priority.label}</span>
                  <span className="text-xs text-gray-600 mt-1">{priority.description}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description * (minimum 10 characters)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={6}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Provide detailed information about the issue, including steps to reproduce, expected behavior, and any error messages... (minimum 10 characters)"
              required
              disabled={loading}
            />
            
            {/* Character Counter */}
            <div className="mt-1 flex justify-between items-start">
              <div className="flex-1">
                {validationErrors.description ? (
                  <p className="text-red-500 text-sm flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {validationErrors.description}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Be as specific as possible to help our support team resolve your issue quickly.
                  </p>
                )}
              </div>
              <div className={`text-sm ml-2 ${
                formData.description.trim().length < 10 
                  ? 'text-red-500' 
                  : formData.description.trim().length >= 10 
                    ? 'text-green-600' 
                    : 'text-gray-500'
              }`}>
                {formData.description.trim().length}/10
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Optional)
            </label>
            
            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {/* Drop Zone */}
            <div
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: Images, PDFs, Documents (Max 10MB)
              </p>
            </div>
            
            {/* File List */}
            {attachedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachedFiles.map((attachedFile) => (
                  <div
                    key={attachedFile.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      {/* File Icon */}
                      <div className="flex-shrink-0">
                        {attachedFile.file.type.startsWith('image/') ? (
                          attachedFile.preview ? (
                            <img
                              src={attachedFile.preview}
                              alt={attachedFile.file.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <Image className="w-10 h-10 text-blue-500" />
                          )
                        ) : attachedFile.file.type === 'application/pdf' ? (
                          <FileText className="w-10 h-10 text-red-500" />
                        ) : (
                          <File className="w-10 h-10 text-gray-500" />
                        )}
                      </div>
                      
                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {attachedFile.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachedFile.file.size)}
                        </p>
                        
                        {/* Progress Bar */}
                        {attachedFile.uploading && (
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${attachedFile.progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Uploading... {attachedFile.progress}%
                            </p>
                          </div>
                        )}
                        
                        {/* Status */}
                        {attachedFile.uploaded && (
                          <div className="flex items-center mt-1">
                            <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                            <span className="text-xs text-green-600">Uploaded</span>
                          </div>
                        )}
                        
                        {attachedFile.error && (
                          <div className="flex items-center mt-1">
                            <AlertCircle className="w-3 h-3 text-red-500 mr-1" />
                            <span className="text-xs text-red-600">{attachedFile.error}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeFile(attachedFile.id)}
                      disabled={attachedFile.uploading}
                      className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || isSubmitting || Object.keys(validateForm()).length > 0}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading || isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Ticket...</span>
                </div>
              ) : (
                'Create Ticket'
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              disabled={loading}
              className="flex-1 sm:flex-none sm:px-6 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketCreate;