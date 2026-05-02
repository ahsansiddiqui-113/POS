import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Backup: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [message, setMessage] = useState('');
  const [backups, setBackups] = useState<any[]>([]);

  const handleManualBackup = async () => {
    // TODO: Implement manual backup
    setMessage('Backup created successfully');
    console.log('Creating manual backup...');
  };

  const handleRestoreBackup = async (backupId: string) => {
    // TODO: Implement restore
    setMessage(`Restoring backup ${backupId}...`);
    console.log('Restoring backup:', backupId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Backup & Recovery</h1>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            {message}
          </div>
        )}

        {/* Manual Backup */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Manual Backup</h2>
          <p className="text-gray-600 mb-4">
            Create an immediate backup of the entire database. This will save a copy to the backup directory.
          </p>
          <button
            onClick={handleManualBackup}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg"
          >
            Create Backup Now
          </button>
        </div>

        {/* Automatic Backups */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Automatic Backups</h2>
          <p className="text-gray-600 mb-4">
            Automatic backups are created daily at midnight. You can manage them below.
          </p>

          {backups.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No backups available</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left">Date & Time</th>
                  <th className="px-4 py-2 text-left">Size</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.id} className="border-t">
                    <td className="px-4 py-3">{backup.createdAt}</td>
                    <td className="px-4 py-3">{backup.size}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRestoreBackup(backup.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Backup Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Backup Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enable Automatic Backups
              </label>
              <input
                type="checkbox"
                defaultChecked={true}
                className="w-4 h-4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Backup Time
              </label>
              <input
                type="time"
                defaultValue="00:00"
                className="px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retention Days
              </label>
              <input
                type="number"
                defaultValue={30}
                className="px-4 py-2 border rounded-lg w-32"
              />
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">
              Save Settings
            </button>
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Back to Dashboard
        </button>
      </main>
    </div>
  );
};

export default Backup;
