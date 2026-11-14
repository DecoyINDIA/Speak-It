# SpeakIt Terms of Use (BG13)

| | |
|---|---|
| Last Updated | 2026-11-08 |
| Version | 1.0 (Public Release) |

Please read these Terms of Use ("Terms") before using the SpeakIt desktop software ("Software"). By installing, launching, or using SpeakIt, you agree to these Terms.

---

## 1. Nature of the Software
SpeakIt is an open-source, client-side Windows desktop utility created to provide voice dictation and formatting. The Software is provided under the terms of the **MIT License**.

---

## 2. Data Processing & Compliance (India DPDP Act 2023 & GDPR)
1. **Zero Data Collection by Author:** The author and maintainers of SpeakIt **do not host any backend servers**, do not create user accounts, and **do not collect, store, transmit, or process** your voice recordings, audio clips, text transcripts, dictionary terms, or snippets.
2. **Local Processing:** By default, all application settings, transcription history, and custom vocabulary are stored exclusively on your local computer in an encrypted or private SQLite database.
3. **No Data Fiduciary Status:** Under India's Digital Personal Data Protection (DPDP) Act 2023 and the General Data Protection Regulation (GDPR), the author is not a Data Fiduciary or Data Processor, as no personal data is ever collected or processed by the author.

---

## 3. Third-Party AI Providers (BYOK)
1. **Direct Communication:** When you choose to configure a third-party speech-to-text or language model provider (such as Groq Inc. or Google LLC), the Software communicates directly between your computer and that provider's API servers using your personal API key.
2. **Provider Terms:** You are solely responsible for reviewing and complying with the respective terms of service and privacy policies of your selected providers.
   - **Groq:** [Groq Terms of Service & Privacy](https://groq.com/privacy/)
   - **Google Gemini:** [Google AI Studio Terms of Service](https://ai.google.dev/terms) (Note: Google's free, un-billed tier data may be reviewed by human reviewers and used to improve Google products).
3. **100% Offline Mode:** You may choose to run the Software exclusively using the local `whisper.cpp` engine, which requires no internet connection and prevents any network transmission of your speech.

---

## 4. Input Simulation & Automated Pasting
1. SpeakIt automatically types or pastes generated text into your active foreground window upon releasing your hotkey.
2. You acknowledge that voice transcription may occasionally produce transcription inaccuracies or misinterpreted words.
3. You are solely responsible for reviewing and verifying the accuracy of any pasted text before transmitting it in emails, messages, documents, financial transactions, or code repositories.
4. The author is not liable for errors, data overwrites, or consequences arising from simulated typing or paste events.

---

## 5. Disclaimer of Warranties & Limitation of Liability
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
