// PanelShelf Create Account

console.log("SIGNUP.JS LOADED");
const signupForm = document.querySelector("#signup-form");

const nameInput = document.querySelector("#signup-name");
const emailInput = document.querySelector("#signup-email");
const passwordInput = document.querySelector("#signup-password");
const confirmPasswordInput = document.querySelector("#signup-confirm-password");

const togglePasswordButton = document.querySelector("#toggle-signup-password");

const signupSubmit = document.querySelector("#signup-submit");
const signupMessage = document.querySelector("#signup-message");


// Show / hide password
togglePasswordButton.addEventListener("click", () => {
  const showingPassword = passwordInput.type === "text";

  passwordInput.type = showingPassword ? "password" : "text";

  togglePasswordButton.textContent = showingPassword
    ? "Show"
    : "Hide";

  togglePasswordButton.setAttribute(
    "aria-label",
    showingPassword ? "Show password" : "Hide password"
  );
});


// Create account
signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // Validate fields
  if (!name || !email || !password || !confirmPassword) {
    signupMessage.textContent =
      "Please complete all fields.";
    return;
  }

  // Validate passwords
  if (password !== confirmPassword) {
    signupMessage.textContent =
      "Passwords do not match.";

    confirmPasswordInput.focus();
    return;
  }

  // Validate password length
  if (password.length < 8) {
    signupMessage.textContent =
      "Password must be at least 8 characters.";

    passwordInput.focus();
    return;
  }

  signupMessage.textContent = "";
  signupSubmit.disabled = true;
  signupSubmit.textContent = "Creating...";

  try {
    const { data, error } =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name
          }
        }
      });

    if (error) {
      console.error(
        "PanelShelf account creation error:",
        error
      );

      signupMessage.textContent =
        error.message;

      return;
    }

    console.log(
      "PanelShelf: Account created successfully.",
      data.user
    );

    /*
     * Supabase may require email confirmation
     * depending on your project settings.
     */

    if (data.user && !data.session) {
      signupMessage.textContent =
        "Account created! Check your email to confirm your account.";

      return;
    }

    signupMessage.textContent =
      "Account created successfully!";

    // Give the user a moment to see the success message.
    setTimeout(() => {
      window.location.href = "index.html";
    }, 800);

  } catch (error) {
    console.error(
      "PanelShelf: Unexpected account creation error:",
      error
    );

    signupMessage.textContent =
      "Something went wrong. Please try again.";

  } finally {
    signupSubmit.disabled = false;
    signupSubmit.textContent = "Create Account";
  }
});

