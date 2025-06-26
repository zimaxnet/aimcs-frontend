export const msalConfig = {
  auth: {
    clientId: "a9ad55e2-d46f-4bad-bce6-c95f1bc43018",
    authority: "https://zimaxai.ciamlogin.com/zimaxai.onmicrosoft.com",
    redirectUri: "https://aimcs.net/",
    knownAuthorities: ["zimaxai.ciamlogin.com"],
    postLogoutRedirectUri: "https://aimcs.net/"
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false
  },
  system: {
    allowNativeBroker: false,
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0:
            console.error(message);
            return;
          case 1:
            console.warn(message);
            return;
          case 2:
            console.info(message);
            return;
          case 3:
            console.debug(message);
            return;
          default:
            console.log(message);
            return;
        }
      }
    }
  }
}; 