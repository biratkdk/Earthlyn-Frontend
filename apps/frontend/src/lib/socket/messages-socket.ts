let disconnectCurrentMessagesSocket: (() => void) | null = null;

export function registerMessagesSocketDisconnect(disconnect: () => void) {
  disconnectCurrentMessagesSocket = disconnect;

  return () => {
    if (disconnectCurrentMessagesSocket === disconnect) {
      disconnectCurrentMessagesSocket = null;
    }
  };
}

export function disconnectMessagesSocket() {
  disconnectCurrentMessagesSocket?.();
  disconnectCurrentMessagesSocket = null;
}
