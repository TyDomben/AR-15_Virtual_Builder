/**
 * ShareButton.jsx
 * Encodes the full build state as a base64 URL fragment.
 * Copies shareable URL to clipboard and shows feedback.
 */
import { useState } from 'react';
import { useBuildStore } from '../store/buildStore';

export default function ShareButton() {
  const { getBuildAsBase64 } = useBuildStore();
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const encoded = getBuildAsBase64();
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        // Fallback: update the URL directly so user can copy manually
        window.location.hash = encoded;
      });
  }

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
        copied
          ? 'bg-green-600 text-white'
          : 'bg-gray-900 text-white hover:bg-gray-700'
      }`}
    >
      {copied ? (
        <>
          <span>✓</span>
          <span>Link Copied!</span>
        </>
      ) : (
        <>
          <span>🔗</span>
          <span>Share Build</span>
        </>
      )}
    </button>
  );
}
