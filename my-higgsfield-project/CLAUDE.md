# My Higgsfield Workflow

## Tools
Image generation: Higgsfield NanoBanana 2
Video generation: Higgsfield Cinema Studio

## Default Settings
Aspect ratio: 9:16
Image count: 8
Quality: 2K unlimited ON
Extra free gens: OFF

## Workflow
1. Navigate to higgsfield.ai/image/nano_banana_2
2. Confirm settings before generating
3. For each prompt:
   a. Clear prompt bar via JS
   b. Take screenshot to verify bar is empty
   c. Type prompt slowly
   d. Click Generate
   e. Clear bar via JS again
   f. Wait 7 seconds
   g. Repeat
4. Save outputs to /images/YYYY-MM-DD/

## Prompt Bar Clear Script
Run this via browser_evaluate before typing each prompt:

const editor = document.querySelector('[id="hf:tour-image-prompt"] [contenteditable]')
  || document.querySelector('[contenteditable="true"]');
editor.innerHTML = '<p><br></p>';
editor.dispatchEvent(new Event('input', { bubbles: true }));

Also saved at: reference/prompt-bar-clear.js

## Rules
- Always clear the prompt bar via JS before typing. Never skip this step.
- Always screenshot after clearing to confirm it's empty
- Never skip settings confirmation
- Go straight to generating, no prompt previews.
- Save all outputs to /images/YYYY-MM-DD/ using today's date.
