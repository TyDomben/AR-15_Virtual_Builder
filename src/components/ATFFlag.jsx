/**
 * ATFFlag.jsx
 * Displays legally-significant configuration flags with full disclaimer.
 * Factual, sourced, disclaimed — never legal advice.
 */
export default function ATFFlag({ flags }) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className="mb-4 space-y-3">
      {/* Disclaimer banner */}
      <div className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <strong>Disclaimer:</strong> This tool is for informational and planning purposes only. It does
        not provide legal advice. Laws regarding firearms vary by state and locality and change over
        time. Always verify the legal status of your build with a qualified attorney before purchasing
        or assembling.
      </div>

      {/* Individual ATF flags */}
      {flags.map((flag) => (
        <div
          key={flag.rule_id}
          className="rounded-lg border border-amber-500 bg-amber-100 px-4 py-3"
        >
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-amber-900 text-sm">{flag.message_short}</p>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">{flag.message_long}</p>
              {flag.atf_source_url && (
                <a
                  href={flag.atf_source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-blue-700 underline hover:text-blue-900"
                >
                  ATF Source →
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
