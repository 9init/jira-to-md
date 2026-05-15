chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "copyTicket" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Failed to send message:", chrome.runtime.lastError.message);
    } else if (response && response.error) {
      console.error("Export failed:", response.error);
    }
  });
});
