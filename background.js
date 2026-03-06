// Register context menu item on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "read-with-adrd",
    title: "Read with ADRD",
    contexts: ["selection"],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "read-with-adrd" && info.selectionText) {
    const text = encodeURIComponent(info.selectionText);
    chrome.windows.create({
      url: `reader.html?text=${text}`,
      type: "popup",
      width: 520,
      height: 380,
      focused: true,
    });
  }
});
