<p align="center">
  <h1>Bisik</h1>
  <p>Bisik is a speech recognation app built with Electron.js and utilizing OpenAI Whisper API</p>
</p>

<div align="center">
  <img src="./assets/images/record.png" alt="Record page screenshot" style="max-width: 500px;">
</div>

# How to use

### On Mac

1. Download the app, install it, and then open it.
2. Go to settings and enter your `OPENAI_API_KEY`.

   <img src="./assets/images/settings.png" alt="Settings page screenshot" style="max-width: 500px;">

3. Press double backslash (\ x2) to activate the transcription. Give permissions if you are asked for them.
4. (Optional) You can also use your own custom prompt in the mode. Go to settings create a new mode and enter your custom prompt.

### On Terminal

1. Clone the repository

```
git clone https://github.com/ekkyarmandi/bisik.git
```

2. Install dependencies

```
npm run dev
```

# How to contribute

- Fork this repository
- Make a PR tell me what changes you made
- Use `npm run build:mac` to build the app for mac
  NOTE: so there are no windows and linux version yet, you can contribute to that.

## References

Sounds Ref:

- https://mixkit.co/free-sound-effects/click/
- https://pixabay.com/sound-effects/search/mp3/
