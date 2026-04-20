// Higgsfield Prompt Bar Clear Fix
// Run this via browser_evaluate before typing each prompt.
// Resets the contenteditable field so Higgsfield registers the change.

const editor = document.querySelector('[id="hf:tour-image-prompt"] [contenteditable]')
  || document.querySelector('[contenteditable="true"]');

editor.innerHTML = '<p><br></p>';
editor.dispatchEvent(new Event('input', { bubbles: true }));
