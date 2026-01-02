import React, { useEffect, useState } from "react";
import { ActiveSession } from "../../lib/active-session";
import { Secret, createSecret, deleteSecret, getSecrets } from "../../lib/api";

export default function SecretBlock() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [componentId] = useState(() => Math.random().toString(36).substring(7));

  // Form state
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Register as active session to capture Esc
    ActiveSession.setActive(componentId);

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!ActiveSession.isActive(componentId)) return;

        if (e.key === "Escape") {
            e.preventDefault();
            e.stopImmediatePropagation();
            setIsOpen(false);
            ActiveSession.clear();
        }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
        window.removeEventListener("keydown", handleKeyDown, { capture: true });
        if (ActiveSession.isActive(componentId)) {
            ActiveSession.clear();
        }
    };
  }, [componentId]);

  const fetchSecrets = async () => {
    try {
      setLoading(true);
      const data = await getSecrets();
      setSecrets(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecrets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key || !value) return;

    try {
      setSubmitting(true);
      await createSecret(key, value, description);
      setKey("");
      setValue("");
      setDescription("");
      fetchSecrets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this secret?")) return;
    try {
      await deleteSecret(id);
      setSecrets(secrets.filter((s) => s.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) {
      return <div className="text-gray-500 italic text-sm">Secrets vault closed.</div>;
  }

  if (loading && secrets.length === 0) return <div className="text-gray-400">Loading secrets...</div>;

  return (
    <div className="p-4 bg-gray-900 border border-gray-700 rounded-md">
      <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-green-400">Secrets Vault</h2>
          <button 
            onClick={() => {
                setIsOpen(false);
                ActiveSession.clear();
            }}
            className="text-gray-500 hover:text-white text-xs border border-gray-700 px-2 py-1 rounded"
          >
              ESC to close
          </button>
      </div>
      
      {error && <div className="mb-4 text-red-400 border border-red-500 p-2 rounded">{error}</div>}

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">My Secrets</h3>
        {secrets.length === 0 ? (
          <div className="text-gray-500 italic">No secrets found. Add one below.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="py-2 text-gray-400 font-medium">Key</th>
                <th className="py-2 text-gray-400 font-medium">Value</th>
                <th className="py-2 text-gray-400 font-medium">Description</th>
                <th className="py-2 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {secrets.map((secret) => (
                <tr key={secret.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800">
                  <td className="py-2 text-green-300 font-mono">{secret.key}</td>
                  <td className="py-2 text-gray-500 font-mono">...{secret.last_4_chars}</td>
                  <td className="py-2 text-gray-400 text-sm">{secret.description || "-"}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleDelete(secret.id)}
                      className="text-red-400 hover:text-red-300 text-sm ml-4"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Add New Secret</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-lg">
          <div>
            <label className="block text-xs uppercase text-gray-500 mb-1">Key (e.g. API_TOKEN)</label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500 font-mono"
              placeholder="MY_SECRET_KEY"
              required
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-gray-500 mb-1">Value</label>
            <div className="flex gap-2">
              <input
                type={showPassword ? "text" : "password"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500 font-mono"
                placeholder="SuperSecretValue123"
                required
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-400 hover:text-white"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
             <label className="block text-xs uppercase text-gray-500 mb-1">Description (Optional)</label>
             <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500"
              placeholder="What is this for?"
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              onClick={(e) => e.stopPropagation()}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving..." : "Save Secret"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
