// PanelShelf Sign In

const supabaseUrl =
  "https://oxecdxxydkohvrawwbfy.supabase.co";

const supabasePublishableKey =
  "sb_publishable_ewHslSeTuZ89rgnDheSX0Q_o8Dw-HNU";

const supabaseClient = window.supabase.createClient(
  supabaseUrl,
  supabasePublishableKey
);


// =========================================
// ELEMENTS
// =========================================

const signinForm =
  document.querySelector("#signin-form");

const emailInput =
  document.querySelector("#signin-email");

const passwordInput =
  document.querySelector("#signin-password");

const togglePasswordButton =
  document.querySelector("#toggle-signin-password");

const signinSubmit =
  document.querySelector("#signin-submit");

const signinMessage =
  document.querySelector("#signin-message");

const forgotPassword =
  document.querySelector("#forgot-password");

const createAccount =
  document.querySelector("#create-account");


// =========================================
// MESSAGE HELPER
// =========================================

function showMessage(message, type = "") {
  if (!signinMessage) {
    return;
  }

  signinMessage.textContent = message;

  signinMessage.classList.remove(
    "success",
    "error"
  );

  if (type) {
    signinMessage.classList.add(type);
  }
}


// =========================================
// SHOW / HIDE PASSWORD
// =========================================

if (togglePasswordButton && passwordInput) {
  togglePasswordButton.addEventListener(
    "click",
    () => {
      const showingPassword =
        passwordInput.type === "text";

      passwordInput.type =
        showingPassword
          ? "password"
          : "text";

      togglePasswordButton.textContent =
        showingPassword
          ? "Show"
          : "Hide";

      togglePasswordButton.setAttribute(
        "aria-label",
        showingPassword
          ? "Show password"
          : "Hide password"
      );
    }
  );
}


// =========================================
// SIGN IN
// =========================================

if (signinForm) {
  signinForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const email =
        emailInput.value.trim();

      const password =
        passwordInput.value;

      if (!email || !password) {
        showMessage(
          "Please enter your email and password.",
          "error"
        );

        return;
      }

      signinMessage.textContent = "";

      signinSubmit.disabled = true;
      signinSubmit.textContent = "Signing in...";

      try {
        const { data, error } =
          await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
          });

        if (error) {
          console.error(
            "PanelShelf sign-in error:",
            error
          );

          showMessage(
            getAuthErrorMessage(error),
            "error"
          );

          return;
        }

        if (!data || !data.user) {
          showMessage(
            "Sign in could not be completed. Please try again.",
            "error"
          );

          return;
        }

        showMessage(
          "Signed in successfully. Loading PanelShelf...",
          "success"
        );

        await new Promise((resolve) =>
          setTimeout(resolve, 400)
        );

        window.location.href = "index.html";

      } catch (error) {
        console.error(
          "PanelShelf unexpected sign-in error:",
          error
        );

        showMessage(
          "Something went wrong while signing in. Please try again.",
          "error"
        );

      } finally {
        signinSubmit.disabled = false;
        signinSubmit.textContent = "Sign In";
      }
    }
  );
}


// =========================================
// FORGOT PASSWORD
// =========================================

if (forgotPassword) {
  forgotPassword.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();

      const email =
        emailInput.value.trim();

      if (!email) {
        showMessage(
          "Enter your email address first, then click Forgot password.",
          "error"
        );

        emailInput.focus();

        return;
      }

      forgotPassword.style.pointerEvents = "none";
      forgotPassword.textContent = "Sending...";

      try {
        const { error } =
          await supabaseClient.auth.resetPasswordForEmail(
            email,
            {
              redirectTo:
                `${window.location.origin}/index.html`
            }
          );

        if (error) {
          console.error(
            "PanelShelf password reset error:",
            error
          );

          showMessage(
            getAuthErrorMessage(error),
            "error"
          );

          return;
        }

        showMessage(
          "Password reset instructions have been sent to your email.",
          "success"
        );

      } catch (error) {
        console.error(
          "PanelShelf unexpected password reset error:",
          error
        );

        showMessage(
          "Unable to send the password reset email. Please try again.",
          "error"
        );

      } finally {
        forgotPassword.style.pointerEvents = "";
        forgotPassword.textContent = "Forgot password?";
      }
    }
  );
}


// =========================================
// CREATE ACCOUNT
// =========================================

if (createAccount) {
  createAccount.addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      window.location.href = "signup.html";
    }
  );
}


// =========================================
// AUTH ERROR MESSAGES
// =========================================

function getAuthErrorMessage(error) {
  if (!error) {
    return "Unable to sign in. Please try again.";
  }

  const message =
    String(error.message || "").toLowerCase();

  if (
    message.includes("invalid login credentials")
  ) {
    return "Incorrect email or password.";
  }

  if (
    message.includes("email not confirmed")
  ) {
    return "Please confirm your email address before signing in.";
  }

  if (
    message.includes("user not found")
  ) {
    return "No account was found with that email address.";
  }

  if (
    message.includes("too many requests")
  ) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (
    message.includes("network")
  ) {
    return "A network error occurred. Check your internet connection and try again.";
  }

  return error.message ||
    "Unable to sign in. Please try again.";
}