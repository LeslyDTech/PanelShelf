const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const coverBucket = "comic-covers";
const coverFunctionName = "smart-endpoint";

let comics = [];
let user = null;

const form = $("#comic-form");
const list = $("#comic-list");
const recentList = $("#recent-list");
const emptyMessage = $("#empty-message");
const filterEmptyMessage = $("#filter-empty-message");

function typeName(type) {
  return {
    comic_issue: "Comic issue",
    graphic_novel: "Graphic novel",
    manga: "Manga",
  }[type] || "Comic issue";
}

function statusLabel(status) {
  return {
    owned: "Owned",
    wishlist: "Wishlist",
    reading: "Reading",
    read: "Read",
  }[status] || "Owned";
}

function itemName(comic) {
  if (!comic.issue) {
    return comic.series;
  }

  return `${comic.series} ${
    comic.item_type === "comic_issue" ? "#" : "Vol. "
  }${comic.issue}`;
}

function redirectUrl() {
  if (window.Capacitor?.isNativePlatform?.()) {
    return "panelshelf://auth/callback";
  }

  return new URL("index.html", window.location.href).toString();
}

function setLoading(button, loading, defaultText) {
  button.disabled = loading;
  button.classList.toggle("is-loading", loading);
  button.textContent = loading ? "Searching" : defaultText;
}

function setCoverPreview(container, coverUrl, title) {
  container.replaceChildren();

  if (!coverUrl) {
    return;
  }

  const image = document.createElement("img");
  image.src = coverUrl;
  image.alt = `${title || "Selected"} cover preview`;

  container.append(image);
}

function createComicCard(comic) {
  const card = document.createElement("article");
  card.className = "comic-card";

  if (comic.cover_url) {
    const image = document.createElement("img");
    image.src = comic.cover_url;
    image.alt = `${comic.series} cover`;
    image.loading = "lazy";
    card.append(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "cover-placeholder";
    placeholder.textContent = "NO COVER";
    card.append(placeholder);
  }

  const type = document.createElement("p");
  type.textContent = typeName(comic.item_type);

  const title = document.createElement("h3");
  title.textContent = itemName(comic);

  const publisher = document.createElement("p");
  publisher.textContent = comic.publisher || "Publisher unknown";

  const status = document.createElement("p");
  status.className = `status-badge status-${comic.status}`;
  status.textContent = statusLabel(comic.status);

  card.append(type, title, publisher, status);

  if (comic.notes) {
    const notes = document.createElement("p");
    notes.className = "notes";
    notes.textContent = comic.notes;
    card.append(notes);
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "edit-button";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () => openEditDialog(comic));

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "delete-button";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => removeComic(comic));

  actions.append(editButton, removeButton);
  card.append(actions);

  return card;
}

function getVisibleComics() {
  const search = $("#collection-search").value.toLowerCase();
  const selectedType = $("#collection-type-filter").value;
  const selectedStatus = $("#collection-filter").value;
  const sort = $("#collection-sort").value;

  const visible = comics.filter((comic) => {
    const text = `${comic.series} ${comic.publisher || ""}`.toLowerCase();

    return (
      text.includes(search) &&
      (selectedType === "all" || comic.item_type === selectedType) &&
      (selectedStatus === "all" || comic.status === selectedStatus)
    );
  });

  if (sort === "title") {
    visible.sort((a, b) => a.series.localeCompare(b.series));
  }

  if (sort === "number") {
    visible.sort((a, b) => (a.issue || 0) - (b.issue || 0));
  }

  return visible;
}

function renderComics() {
  list.replaceChildren();
  recentList.replaceChildren();

  const visible = getVisibleComics();
  const recentEmptyMessage = $("#recent-empty-message");

  emptyMessage.hidden = !user || comics.length > 0;
  filterEmptyMessage.hidden = !user || !comics.length || visible.length > 0;

  if (!user) {
    emptyMessage.textContent = "Sign in to start building your collection.";
    recentEmptyMessage.textContent = "Sign in to see recent items.";
  } else if (!comics.length) {
    emptyMessage.textContent = "Your collection is empty. Add your first item.";
    recentEmptyMessage.textContent = "Add an item to see it here.";
  }

  visible.forEach((comic) => list.append(createComicCard(comic)));
  comics.slice(0, 4).forEach((comic) => recentList.append(createComicCard(comic)));

  recentEmptyMessage.hidden = Boolean(user && comics.length);

  $("#total-count").textContent = comics.length;
  $("#owned-count").textContent = comics.filter(
    (comic) => comic.status === "owned"
  ).length;
  $("#reading-count").textContent = comics.filter(
    (comic) => comic.status === "reading"
  ).length;
  $("#wishlist-count").textContent = comics.filter(
    (comic) => comic.status === "wishlist"
  ).length;
}

async function loadComics() {
  if (!user) {
    comics = [];
    renderComics();
    return;
  }

  const { data, error } = await supabaseClient
    .from("comics")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  comics = data || [];
  renderComics();
}

async function deleteStoredCover(coverPath) {
  if (!coverPath) {
    return;
  }

  const { error } = await supabaseClient.storage
    .from(coverBucket)
    .remove([coverPath]);

  if (error) {
    console.error("Could not delete cover image:", error);
  }
}

async function removeComic(comic) {
  if (!confirm(`Remove ${itemName(comic)} from your collection?`)) {
    return;
  }

  const { error } = await supabaseClient
    .from("comics")
    .delete()
    .eq("id", comic.id);

  if (error) {
    alert("PanelShelf could not remove that item. Please try again.");
    return;
  }

  await deleteStoredCover(comic.cover_path);
  comics = comics.filter((item) => item.id !== comic.id);
  renderComics();
}

function openEditDialog(comic) {
  $("#edit-id").value = comic.id;
  $("#edit-item-type").value = comic.item_type;
  $("#edit-series").value = comic.series;
  $("#edit-issue").value = comic.issue || "";
  $("#edit-publisher").value = comic.publisher || "";
  $("#edit-notes").value = comic.notes || "";
  $("#edit-status").value = comic.status;
  $("#edit-cover-url").value = comic.cover_url || "";
  $("#edit-cover-path").value = comic.cover_path || "";
  $("#edit-cover-message").textContent = "";
  $("#edit-cover-suggestions").replaceChildren();

  setCoverPreview($("#edit-cover-preview"), comic.cover_url, comic.series);
  $("#edit-dialog").showModal();
}

async function getFunctionError(error) {
  try {
    if (error.context) {
      const details = await error.context.json();
      return details.error || details.message;
    }
  } catch {
    return "";
  }

  return "";
}

async function findCoverSuggestions(title, issue, publisher, itemType) {
  const { data, error } = await supabaseClient.functions.invoke(
    coverFunctionName,
    {
      body: {
        title,
        issue: issue ? Number(issue) : null,
        publisher,
        itemType,
      },
    }
  );

  if (error) {
    const message = await getFunctionError(error);
    throw new Error(message || "Cover search is unavailable right now.");
  }

  return data?.covers || [];
}

function displayCoverSuggestions(
  container,
  covers,
  title,
  onSelect
) {
  container.replaceChildren();

  covers.forEach((coverUrl) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cover-option";
    button.setAttribute("aria-label", `Use this cover for ${title}`);

    const image = document.createElement("img");
    image.src = coverUrl;
    image.alt = `Suggested cover for ${title}`;
    image.loading = "lazy";

    button.append(image);
    button.addEventListener("click", () => onSelect(coverUrl));
    container.append(button);
  });
}

function fileExtension(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && /^[a-z0-9]+$/.test(extension)) {
    return extension;
  }

  return "jpg";
}

async function uploadCover(file) {
  if (!user) {
    throw new Error("Please sign in before uploading a cover.");
  }

  const acceptedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (!acceptedTypes.includes(file.type)) {
    throw new Error("Choose a PNG, JPG, WEBP, or GIF image.");
  }

  if (file.size > 4 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 4 MB.");
  }

  const path = `${user.id}/${crypto.randomUUID()}.${fileExtension(file)}`;

  const { error } = await supabaseClient.storage
    .from(coverBucket)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
    });

  if (error) {
    throw new Error("PanelShelf could not upload that image.");
  }

  const { data } = supabaseClient.storage
    .from(coverBucket)
    .getPublicUrl(path);

  return {
    path,
    url: data.publicUrl,
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!user) {
    $("#auth-dialog").showModal();
    return;
  }

  const comic = {
    user_id: user.id,
    item_type: $("#item-type").value,
    series: $("#series").value.trim(),
    issue: $("#issue").value ? Number($("#issue").value) : null,
    publisher: $("#publisher").value.trim() || null,
    notes: $("#notes").value.trim() || null,
    status: $("#status").value,
    cover_url: $("#selected-cover-url").value || null,
    cover_path: $("#selected-cover-path").value || null,
  };

  const { data, error } = await supabaseClient
    .from("comics")
    .insert(comic)
    .select()
    .single();

  if (error) {
    $("#cover-message").textContent =
      "PanelShelf could not save this item. Please try again.";
    return;
  }

  comics.unshift(data);
  form.reset();
  $("#selected-cover-url").value = "";
  $("#selected-cover-path").value = "";
  $("#cover-suggestions").replaceChildren();
  $("#cover-message").textContent = "Added to your shelf.";
  renderComics();
});

$("#find-cover-button").addEventListener("click", async () => {
  const button = $("#find-cover-button");
  const title = $("#series").value.trim();
  const issue = $("#issue").value.trim();
  const publisher = $("#publisher").value.trim();
  const itemType = $("#item-type").value;
  const message = $("#cover-message");

  if (!user) {
    $("#auth-dialog").showModal();
    return;
  }

  if (!title) {
    message.textContent = "Add a title first.";
    $("#series").focus();
    return;
  }

  setLoading(button, true, "Find cover");
  message.textContent = "Searching for covers...";
  $("#cover-suggestions").replaceChildren();

  try {
    const covers = await findCoverSuggestions(
      title,
      issue,
      publisher,
      itemType
    );

    if (!covers.length) {
      message.textContent =
        "No matching cover found. You can upload your own instead.";
      return;
    }

    displayCoverSuggestions(
      $("#cover-suggestions"),
      covers,
      title,
      (coverUrl) => {
        $("#selected-cover-url").value = coverUrl;
        $("#selected-cover-path").value = "";
        message.textContent =
          "Cover selected. Add it to your shelf when ready.";
      }
    );

    message.textContent = "Choose one of the suggested covers.";
  } catch (error) {
    message.textContent =
      error.message || "Cover search is unavailable right now.";
  } finally {
    setLoading(button, false, "Find cover");
  }
});

$("#cover-upload").addEventListener("change", async () => {
  const file = $("#cover-upload").files[0];

  if (!file) {
    return;
  }

  try {
    $("#cover-message").textContent = "Uploading your cover...";
    const cover = await uploadCover(file);

    $("#selected-cover-url").value = cover.url;
    $("#selected-cover-path").value = cover.path;
    $("#cover-message").textContent =
      "Your cover is ready. Add it to your shelf when ready.";
  } catch (error) {
    $("#cover-message").textContent = error.message;
  }
});

$("#edit-find-cover-button").addEventListener("click", async () => {
  const button = $("#edit-find-cover-button");
  const title = $("#edit-series").value.trim();
  const issue = $("#edit-issue").value.trim();
  const publisher = $("#edit-publisher").value.trim();
  const itemType = $("#edit-item-type").value;
  const message = $("#edit-cover-message");

  if (!title) {
    message.textContent = "Add a title first.";
    $("#edit-series").focus();
    return;
  }

  setLoading(button, true, "Find replacement cover");
  message.textContent = "Searching for covers...";
  $("#edit-cover-suggestions").replaceChildren();

  try {
    const covers = await findCoverSuggestions(
      title,
      issue,
      publisher,
      itemType
    );

    if (!covers.length) {
      message.textContent =
        "No matching cover found. You can upload your own instead.";
      return;
    }

    displayCoverSuggestions(
      $("#edit-cover-suggestions"),
      covers,
      title,
      (coverUrl) => {
        $("#edit-cover-url").value = coverUrl;
        $("#edit-cover-path").value = "";
        setCoverPreview($("#edit-cover-preview"), coverUrl, title);
        message.textContent = "Replacement cover selected.";
      }
    );

    message.textContent = "Choose a replacement cover.";
  } catch (error) {
    message.textContent =
      error.message || "Cover search is unavailable right now.";
  } finally {
    setLoading(button, false, "Find replacement cover");
  }
});

$("#edit-cover-upload").addEventListener("change", async () => {
  const file = $("#edit-cover-upload").files[0];

  if (!file) {
    return;
  }

  try {
    $("#edit-cover-message").textContent =
      "Uploading replacement cover...";

    const cover = await uploadCover(file);

    $("#edit-cover-url").value = cover.url;
    $("#edit-cover-path").value = cover.path;

    setCoverPreview(
      $("#edit-cover-preview"),
      cover.url,
      $("#edit-series").value
    );

    $("#edit-cover-message").textContent = "Replacement cover ready.";
  } catch (error) {
    $("#edit-cover-message").textContent = error.message;
  }
});

$("#edit-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = $("#edit-id").value;
  const oldComic = comics.find(
    (comic) => String(comic.id) === String(id)
  );

  const newCoverPath = $("#edit-cover-path").value || null;

  const updates = {
    item_type: $("#edit-item-type").value,
    series: $("#edit-series").value.trim(),
    issue: $("#edit-issue").value
      ? Number($("#edit-issue").value)
      : null,
    publisher: $("#edit-publisher").value.trim() || null,
    notes: $("#edit-notes").value.trim() || null,
    status: $("#edit-status").value,
    cover_url: $("#edit-cover-url").value || null,
    cover_path: newCoverPath,
  };

  const { error } = await supabaseClient
    .from("comics")
    .update(updates)
    .eq("id", id);

  if (error) {
    $("#edit-message").textContent =
      "PanelShelf could not save those changes. Please try again.";
    return;
  }

  if (oldComic?.cover_path && oldComic.cover_path !== newCoverPath) {
    await deleteStoredCover(oldComic.cover_path);
  }

  $("#edit-dialog").close();
  await loadComics();
});

function exportCsv() {
  const rows = [
    ["Type", "Title", "Issue/Volume", "Publisher", "Status", "Notes"],
    ...comics.map((comic) => [
      typeName(comic.item_type),
      comic.series,
      comic.issue || "",
      comic.publisher || "",
      comic.status,
      comic.notes || "",
    ]),
  ];

  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");

  const link = document.createElement("a");

  link.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );

  link.download = "panelshelf-collection.csv";
  link.click();

  URL.revokeObjectURL(link.href);
}

function showView(viewId) {
  $$(".view").forEach((view) => {
    view.hidden = view.id !== viewId;
  });

  const radio = document.querySelector(
    `.comic-radio-group input[value="${viewId}"]`
  );

  if (radio) {
    radio.checked = true;
  }
}

$$("[data-view]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

$$('.comic-radio-group input[name="main-nav"]').forEach((radio) => {
  radio.addEventListener("change", () => showView(radio.value));
});

[
  "#collection-search",
  "#collection-type-filter",
  "#collection-filter",
  "#collection-sort",
].forEach((selector) => {
  $(selector).addEventListener("input", renderComics);
  $(selector).addEventListener("change", renderComics);
});

$("#export-button").addEventListener("click", exportCsv);

$("#close-edit-button").addEventListener("click", () => {
  $("#edit-dialog").close();
});

// Helper function to force an asynchronous pause so the CSS engine handles transitions correctly
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLoaderSequence() {
  const screen = $("#loading-screen");

  if (!screen) {
    console.error("PanelShelf: #loading-screen was not found.");
    return false;
  }

  // Make sure the loader starts from a clean state
  screen.hidden = false;
  screen.classList.remove("is-active");

  // Force the browser to render the initial state
  void screen.offsetWidth;

  // Activate the transition/animation
  screen.classList.add("is-active");

  // Keep it visible long enough for the animation to play
  await delay(1400);

  return true;
}

async function hideLoaderSequence() {
  const screen = $("#loading-screen");

  if (!screen) {
    return;
  }

  // Start the fade-out
  screen.classList.remove("is-active");

  // Give the CSS transition time to finish
  await delay(250);

  // Completely remove it from the page flow
  screen.hidden = true;
}

async function openAuthWithLoader() {
  const screen = $("#loading-screen");

  if (!screen) {
    console.error("PanelShelf: #loading-screen was not found.");
    return;
  }

  // Play the racing transition first
  await runLoaderSequence();

  // Redirect only after the transition has finished
  window.location.href = "signin.html";
}

$("#open-auth-button").addEventListener(
  "click",
  openAuthWithLoader
);

$("#close-auth-button").addEventListener("click", () => {
  $("#auth-dialog").close();
});

$("#close-reset-password-button").addEventListener("click", () => {
  $("#reset-password-dialog").close();
});

$("#toggle-password-button").addEventListener("click", () => {
  const password = $("#auth-password");
  const showing = password.type === "text";

  password.type = showing ? "password" : "text";

  $("#toggle-password-button").textContent = showing
    ? "Show"
    : "Hide";
});

$("#toggle-new-password-button").addEventListener("click", () => {
  const password = $("#new-password");
  const showing = password.type === "text";

  password.type = showing ? "password" : "text";

  $("#toggle-new-password-button").textContent = showing
    ? "Show"
    : "Hide";
});

// SUBMIT HANDLE: Correctly spaces the asynchronous timeline out so the loader runs first!
$("#auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const dialog = $("#auth-dialog");
  const email = $("#auth-email").value;
  const password = $("#auth-password").value;

  dialog.close();

  await runLoaderSequence();

  const { error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

  await hideLoaderSequence();

  if (error) {
    dialog.showModal();
    $("#auth-message").textContent = error.message;
    return;
  }

  $("#auth-message").textContent = "";
});


$("#sign-up-button").addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signUp({
    email: $("#auth-email").value,
    password: $("#auth-password").value,
    options: {
      emailRedirectTo: redirectUrl(),
    },
  });

  $("#auth-message").textContent = error
    ? error.message
    : "Check your email to confirm your new account.";
});

$("#resend-confirmation-button").addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.resend({
    type: "signup",
    email: $("#auth-email").value,
    options: {
      emailRedirectTo: redirectUrl(),
    },
  });

  $("#auth-message").textContent = error
    ? error.message
    : "Confirmation email sent.";
});

$("#forgot-password-button").addEventListener("click", async () => {
  const email = $("#auth-email").value.trim();

  if (!email) {
    $("#auth-message").textContent =
      "Enter your email address first, then select Reset password.";

    $("#auth-email").focus();
    return;
  }

  const { error } =
    await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl(),
    });

  $("#auth-message").textContent = error
    ? error.message
    : "Check your email for a password reset link.";
});

$("#reset-password-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = $("#new-password").value;
  const confirmation = $("#confirm-new-password").value;

  if (password !== confirmation) {
    $("#reset-password-message").textContent =
      "The passwords do not match.";

    return;
  }

  const { error } = await supabaseClient.auth.updateUser({
    password,
  });

  $("#reset-password-message").textContent = error
    ? error.message
    : "Password updated. You can now sign in.";

  if (!error) {
    $("#reset-password-form").reset();

    setTimeout(() => {
      $("#reset-password-dialog").close();
    }, 1200);
  }
});

$("#sign-out-button").addEventListener("click", () => {
  supabaseClient.auth.signOut();
});

async function startPanelShelf() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  user = session?.user || null;

  $("#current-user").textContent = user?.email || "Not signed in";
  $("#open-auth-button").hidden = Boolean(user);
  $("#sign-out-button").hidden = !user;

  await loadComics();

  const { data } = await supabaseClient.rpc("get_member_count");

  if (data !== null) {
    $("#member-count").textContent = data;
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    user = session?.user || null;

    $("#current-user").textContent = user?.email || "Not signed in";
    $("#open-auth-button").hidden = Boolean(user);
    $("#sign-out-button").hidden = !user;

    if (event === "PASSWORD_RECOVERY") {
      $("#reset-password-dialog").showModal();
    }

    loadComics();
  });
}

(() => {
  const deleteAccountButton = document.querySelector(
    "#delete-account-button"
  );

  const deleteAccountDialog = document.querySelector(
    "#delete-account-dialog"
  );

  const deleteAccountForm = document.querySelector(
    "#delete-account-form"
  );

  const deleteAccountConfirmation = document.querySelector(
    "#delete-account-confirmation"
  );

  const deleteAccountMessage = document.querySelector(
    "#delete-account-message"
  );

  const cancelDeleteAccountButton = document.querySelector(
    "#cancel-delete-account-button"
  );

  if (
    !deleteAccountButton ||
    !deleteAccountDialog ||
    !deleteAccountForm ||
    !deleteAccountConfirmation ||
    !deleteAccountMessage ||
    !cancelDeleteAccountButton
  ) {
    return;
  }

  function updateDeleteAccountButton(session) {
    deleteAccountButton.hidden = !session?.user;
  }

  deleteAccountButton.addEventListener("click", () => {
    deleteAccountMessage.textContent = "";
    deleteAccountConfirmation.value = "";
    deleteAccountDialog.showModal();
    deleteAccountConfirmation.focus();
  });

  cancelDeleteAccountButton.addEventListener("click", () => {
    deleteAccountDialog.close();
  });

  deleteAccountDialog.addEventListener("close", () => {
    deleteAccountForm.reset();
    deleteAccountMessage.textContent = "";
  });

  deleteAccountForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (deleteAccountConfirmation.value.trim() !== "DELETE") {
      deleteAccountMessage.textContent =
        "Type DELETE exactly to continue.";

      deleteAccountConfirmation.focus();
      return;
    }

    const submitButton = deleteAccountForm.querySelector(
      'button[type="submit"]'
    );

    submitButton.disabled = true;
    deleteAccountMessage.textContent = "Deleting your account...";

    try {
      const { error } = await supabaseClient.functions.invoke(
        "delete-account",
        {
          body: {
            confirmation: "DELETE",
          },
        }
      );

      if (error) {
        throw error;
      }

      deleteAccountMessage.textContent =
        "Your account has been permanently deleted.";

      await supabaseClient.auth.signOut({
        scope: "local",
      });

      window.setTimeout(() => {
        window.location.assign("index.html");
      }, 1200);
    } catch (error) {
      console.error("Account deletion failed:", error);

      deleteAccountMessage.textContent =
        "PanelShelf could not delete your account. Please try again.";

      submitButton.disabled = false;
    }
  });

  supabaseClient.auth.getUser().then(({ data }) => {
    updateDeleteAccountButton(data);
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateDeleteAccountButton(session);
  });
})();

startPanelShelf();