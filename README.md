# Sytes-obfuscator

🛡️ LuaVeil

LuaVeil is a web-based Lua/Luau code protection tool designed to transform and protect source code you own.

✨ Features

- 🔐 Identifier renaming
- 🔤 String transformation
- 🧹 Comment removal
- ⚡ Optional whitespace minification
- 📁 ".lua" / ".luau" file upload
- 📋 Copy protected output
- 💾 Download protected code
- 📱 Mobile-friendly interface
- 🌐 Runs directly in the browser

📁 Project Structure

LuaVeil/
├── index.html
├── style.css
├── script.js
├── obfuscator.html
├── obfuscator.js
└── README.md

🚀 Getting Started

No build system is required.

Open:

index.html

Then select Start Obfuscating to open the LuaVeil obfuscator.

🛠️ Obfuscator

LuaVeil currently provides several configurable transformations:

Feature| Description
Identifier Renaming| Renames supported local identifiers
String Encoding| Transforms supported string literals
Comment Removal| Removes Lua comments
Minification| Reduces unnecessary whitespace
File Upload| Loads ".lua", ".luau", and ".txt" files
Copy Output| Copies transformed code
Download Output| Downloads the transformed Lua file

🔐 Protection

LuaVeil is a source-code transformation tool. Obfuscation can make source code harder to understand, but it cannot guarantee that code will never be reverse-engineered.

For sensitive logic, consider keeping important functionality server-side.

Always test generated output before deploying it.

📱 Mobile Support

LuaVeil is designed to work on:

- 📱 Android
- 📱 iOS
- 💻 Windows
- 💻 macOS
- 🌐 Modern web browsers

⚠️ Responsible Use

LuaVeil is intended for protecting and transforming Lua/Luau code that you own or have permission to modify.

Do not use LuaVeil to conceal malicious software or bypass security systems.

📄 License

Copyright © 2026 LuaVeil.

Built for developers who want more control over their Lua/Luau source code.
