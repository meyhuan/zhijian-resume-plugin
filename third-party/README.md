# License supplements

Some npm tarballs omit their repository license file. These unmodified copies are included so the generated distribution notices contain the terms and attribution rather than just SPDX identifiers.

Retrieved 2026-11-18:

- cfworker-LICENSE: https://github.com/cfworker/cfworker/blob/1a0aa37471850c28a4673e12e871e010ea6c26e0/LICENSE.md (published json-schema 4.1.6 gitHead).
- puppeteer-LICENSE: https://github.com/puppeteer/puppeteer/blob/970bda63c03d96b7a42d96fe44e35da1b4dc4a8b/LICENSE (published puppeteer-core 24.43.1 gitHead; shared Puppeteer project license for browsers).
- degenerator-LICENSE: https://github.com/TooTallNate/proxy-agents/blob/main/packages/degenerator/LICENSE (upstream snapshot; npm 5.0.1 has no gitHead).
- react-remove-scroll-bar-LICENSE: https://github.com/theKashey/react-remove-scroll-bar/blob/master/LICENSE (upstream snapshot; the published 2.3.8 gitHead does not contain this file).

The Windows x64 and macOS canvas binary packages use the license from the installed @napi-rs/canvas parent package of the same version. Regenerate THIRD_PARTY_NOTICES.md after dependency changes and review upstream supplements when upgrading these packages.
