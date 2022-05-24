const Auth = {
  isConnected() {
    const walletConnect = localStorage.getItem("WALLET_CONNECTED");
    if (!walletConnect) {
      return false;
    }
    return true;
  },
  connect() {
    localStorage.setItem("WALLET_CONNECTED", "connected");
  },
  disconnect() {
    localStorage.removeItem("WALLET_CONNECTED");
  },
};

export default Auth;
