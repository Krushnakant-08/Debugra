/**
 * CollaborationControls
 * Renders the access control bar inside the editor tab bar when a room is active.
 * Handles: request dropdowns, allowed editors list, take/release/request access buttons.
 */
export default function CollaborationControls({ room, user }) {
  const {
    roomData, activeUsers, isAuthor, isAllowedEditor, isCurrentEditor, isReadOnly,
    currentEditorName, showRequestsDropdown, setShowRequestsDropdown,
    approveAccess, denyAccess, revokeAccess, takeControl, releaseControl, requestAccess, leaveRoom,
  } = room;

  return (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', overflow: 'visible', whiteSpace: 'nowrap', maxWidth: '60vw', paddingBottom: '2px' }}>

      {/* Pending access requests dropdown (author only) */}
      {isAuthor && roomData?.editRequests?.length > 0 && (
        <div style={{ position: 'relative', marginRight: '8px', paddingRight: '8px', borderRight: '1px solid var(--border)' }}>
          <button
            onClick={() => setShowRequestsDropdown(!showRequestsDropdown)}
            style={{ background: 'var(--bg-3)', color: 'var(--yellow)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}
          >
            Requests ({roomData.editRequests.length})
            <span style={{ transform: showRequestsDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▾</span>
          </button>
          {showRequestsDropdown && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              {roomData.editRequests.map((req) => (
                <div key={req.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: 'var(--bg-2)', borderRadius: '3px' }}>
                  <span style={{ color: 'var(--text-0)' }}>{req.displayName}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => approveAccess(req.uid)} style={{ color: '#3fb950', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }} title="Approve">✓</button>
                    <button onClick={() => denyAccess(req.uid)} style={{ color: '#f44747', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }} title="Deny">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Allowed editors list (author can revoke) */}
      {isAuthor && roomData?.allowedEditors?.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', marginRight: '8px', paddingRight: '8px', borderRight: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-2)', marginRight: '2px' }}>Allowed:</span>
          {roomData.allowedEditors.filter((uid) => uid !== user.uid).map((uid) => {
            const name = activeUsers.find((u) => u.uid === uid)?.displayName || 'Guest';
            return (
              <div key={uid} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-1)', padding: '2px 6px', borderRadius: '4px', gap: '4px' }}>
                <span style={{ color: 'var(--text-0)' }}>{name}</span>
                <button onClick={() => revokeAccess(uid)} style={{ color: '#f44747', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.6rem' }} title="Revoke">✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Current editor label */}
      <span style={{ color: 'var(--text-2)' }}>
        Editor: <strong style={{ color: isCurrentEditor ? 'var(--green)' : 'var(--accent)' }}>
          {isCurrentEditor ? 'You' : currentEditorName}
        </strong>
      </span>

      {/* Request / Take / Release access buttons */}
      {isReadOnly && !isAllowedEditor && (
        <button onClick={requestAccess} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>
          Request Access
        </button>
      )}
      {isReadOnly && isAllowedEditor && (
        <button onClick={takeControl} style={{ background: '#2ea043', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>
          Take Control
        </button>
      )}
      {isCurrentEditor && (
        <button onClick={releaseControl} style={{ background: 'var(--bg-3)', color: 'var(--text-1)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>
          Release
        </button>
      )}

      {/* Exit Room button */}
      <button onClick={leaveRoom} style={{ background: '#f44747', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', flexShrink: 0, marginLeft: '4px' }}>
        Exit
      </button>
    </div>
  );
}
