(() => {
  const anchor = document.querySelector(".founder-panel");

  if (!anchor) {
    return;
  }

  const founderStatusBox = document.createElement("section");
  founderStatusBox.className = "founder-status-box";

  founderStatusBox.innerHTML = `
    <p class="eyebrow">Founder status</p>
    <h2>Currently reading</h2>
    <p id="founder-status-text">Loading...</p>

    <form id="founder-status-form" hidden>
      <label for="founder-status-input">Update currently reading</label>
      <input
        id="founder-status-input"
        maxlength="120"
        placeholder="e.g. Currently reading: Saga Vol. 1"
      >
      <button type="submit">Update status</button>
      <p id="founder-status-message"></p>
    </form>
  `;

  anchor.after(founderStatusBox);

  const founderStatusText = document.querySelector("#founder-status-text");
  const founderStatusForm = document.querySelector("#founder-status-form");
  const founderStatusInput = document.querySelector("#founder-status-input");
  const founderStatusMessage = document.querySelector("#founder-status-message");

  async function loadFounderStatus() {
    const { data, error } = await supabaseClient
      .from("founder_status")
      .select("currently_reading")
      .eq("id", true)
      .single();

    if (error) {
      founderStatusText.textContent = "Founder status unavailable.";
      return;
    }

    founderStatusText.textContent = data.currently_reading;
    founderStatusInput.value = data.currently_reading;
  }

  async function checkAdminAccess() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
      founderStatusForm.hidden = true;
      return;
    }

    const { data } = await supabaseClient
      .from("admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    founderStatusForm.hidden = !data;
  }

  founderStatusForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const newStatus = founderStatusInput.value.trim();

    if (!newStatus) {
      return;
    }

    const { error } = await supabaseClient
      .from("founder_status")
      .update({
        currently_reading: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    if (error) {
      founderStatusMessage.textContent = "Could not update status.";
      return;
    }

    founderStatusText.textContent = newStatus;
    founderStatusMessage.textContent = "Status updated.";
  });

  supabaseClient.auth.onAuthStateChange(checkAdminAccess);

  loadFounderStatus();
  checkAdminAccess();
})();