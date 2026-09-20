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

/* =========================================
   BASIC HELPERS
========================================= */

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

/* =========================================
   COLLECTION CARD
========================================= */

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

  editButton.addEventListener("click", () => {
    openEditDialog(comic);
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "delete-button";
  removeButton.textContent = "Remove";

  removeButton.addEventListener("click", () => {
    removeComic(comic);
  });

  actions.append(editButton, removeButton);
  card.append(actions);

  return card;
}

/* =========================================
   DASHBOARD CARD
========================================= */

function createDashboardComic(comic) {
  const card = document.createElement("article");
  card.className = "dashboard-comic";

  if (comic.cover_url) {
    const image = document.createElement("img");
    image.src = comic.cover_url;
    image.alt = `${comic.series} cover`;
    image.loading = "lazy";
    card.append(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "dashboard-cover-placeholder";
    placeholder.textContent = "NO COVER";
    card.append(placeholder);
  }

  const title = document.createElement("h3");
  title.textContent = itemName(comic);

  const publisher = document.createElement("p");
  publisher.textContent =
    comic.publisher || typeName(comic.item_type);

  const status = document.createElement("p");
  status.className = `status-badge status-${comic.status}`;
  status.textContent = statusLabel(comic.status);

  card.append(title, publisher, status);

  return card;
}

/* =========================================
   MINI READING CARD
========================================= */

function createMiniComic(comic) {
  const card = document.createElement("article");
  card.className = "mini-comic";

  if (comic.cover_url) {
    const image = document.createElement("img");
    image.src = comic.cover_url;
    image.alt = `${comic.series} cover`;
    image.loading = "lazy";
    card.append(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "mini-cover-placeholder";
    placeholder.textContent = "NO COVER";
    card.append(placeholder);
  }

  const details = document.createElement("div");

  const title = document.createElement("h3");
  title.textContent = itemName(comic);

  const publisher = document.createElement("p");
  publisher.textContent =
    comic.publisher || typeName(comic.item_type);

  details.append(title, publisher);
  card.append(details);

  return card;
}

/* =========================================
   FEATURED COMIC
========================================= */

function renderFeaturedComic() {
  const container = $("#featured-comic");

  if (!container) {
    return;
  }

  container.replaceChildren();

  const comic = comics[0];

  if (!comic) {
    const empty = document.createElement("div");
    empty.className = "featured-empty";

    const icon = document.createElement("div");
    icon.className = "empty-icon";
    icon.textContent = "▤";

    const title = document.createElement("h2");
    title.textContent = "Your shelf is waiting.";

    const copy = document.createElement("p");
    copy.textContent =
      "Add your first comic and it will appear here.";

    const button = document.createElement("button");
    button.className = "small-action";
    button.type = "button";
    button.textContent = "Add your first comic";

    button.addEventListener("click", () => {
      showView("add-view");
    });

    empty.append(icon, title, copy, button);
    container.append(empty);

    return;
  }

  const featured = document.createElement("div");
  featured.className = "featured-item";

  if (comic.cover_url) {
    const image = document.createElement("img");
    image.src = comic.cover_url;
    image.alt = `${comic.series} cover`;
    image.loading = "lazy";
    featured.append(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "featured-cover-placeholder";
    placeholder.textContent = "NO COVER";
    featured.append(placeholder);
  }

  const details = document.createElement("div");
  details.className = "featured-details";

  const label = document.createElement("span");
  label.className = "panel-label";
  label.textContent = "LATEST ADDITION";

  const title = document.createElement("h3");
  title.textContent = itemName(comic);

  const type = document.createElement("p");
  type.textContent = typeName(comic.item_type);

  const publisher = document.createElement("p");
  publisher.textContent =
    comic.publisher || "Publisher unknown";

  const status = document.createElement("p");
  status.className = `status-badge status-${comic.status}`;
  status.textContent = statusLabel(comic.status);

  details.append(
    label,
    title,
    type,
    publisher,
    status
  );

  featured.append(details);
  container.append(featured);
}

/* =========================================
   DASHBOARD RENDERING
========================================= */

function renderDashboard() {
  const dashboardGrid = $("#dashboard-comic-grid");
  const recentGrid = $("#dashboard-recent-list");
  const continueGrid = $("#continue-reading-list");

  if (!dashboardGrid || !recentGrid || !continueGrid) {
    return;
  }

  dashboardGrid.replaceChildren();
  recentGrid.replaceChildren();
  continueGrid.replaceChildren();

  if (!user) {
    const message = document.createElement("div");
    message.className = "dashboard-empty";
    message.textContent =
      "Sign in and add comics to start building your shelf.";

    dashboardGrid.append(message);

    const recentMessage = document.createElement("div");
    recentMessage.className = "dashboard-empty";
    recentMessage.textContent =
      "Sign in to see recently added comics.";

    recentGrid.append(recentMessage);

    const readingMessage = document.createElement("div");
    readingMessage.className = "dashboard-empty";
    readingMessage.textContent =
      "Sign in to continue reading.";

    continueGrid.append(readingMessage);

    renderFeaturedComic();
    return;
  }

  if (!comics.length) {
    const message = document.createElement("div");
    message.className = "dashboard-empty";
    message.textContent =
      "Your collection is empty. Add your first comic.";

    dashboardGrid.append(message);

    const recentMessage = document.createElement("div");
    recentMessage.className = "dashboard-empty";
    recentMessage.textContent =
      "Add a comic to see it here.";

    recentGrid.append(recentMessage);

    const readingMessage = document.createElement("div");
    readingMessage.className = "dashboard-empty";
    readingMessage.textContent =
      "Nothing currently marked as reading.";

    continueGrid.append(readingMessage);

    renderFeaturedComic();
    return;
  }

  comics
    .slice(0, 6)
    .forEach((comic) => {
      dashboardGrid.append(
        createDashboardComic(comic)
      );
    });

  comics
    .slice(0, 5)
    .forEach((comic) => {
      recentGrid.append(
        createDashboardComic(comic)
      );
    });

  const reading = comics.filter(
    (comic) => comic.status === "reading"
  );

  if (!reading.length) {
    const message = document.createElement("div");
    message.className = "dashboard-empty";
    message.textContent =
      "Nothing currently marked as reading.";

    continueGrid.append(message);
  } else {
    reading
      .slice(0, 5)
      .forEach((comic) => {
        continueGrid.append(
          createMiniComic(comic)
        );
      });
  }

  renderFeaturedComic();
}

/* =========================================
   COLLECTION FILTERING
========================================= */

function getVisibleComics() {
  const searchInput = $("#collection-search");
  const typeFilter = $("#collection-type-filter");
  const statusFilter = $("#collection-filter");
  const sortSelect = $("#collection-sort");

  const search = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  const type = typeFilter
    ? typeFilter.value
    : "all";

  const status = statusFilter
    ? statusFilter.value
    : "all";

  const sort = sortSelect
    ? sortSelect.value
    : "newest";

  let visible = comics.filter((comic) => {
    const matchesSearch =
      !search ||
      itemName(comic)
        .toLowerCase()
        .includes(search) ||
      (comic.publisher || "")
        .toLowerCase()
        .includes(search) ||
      (comic.notes || "")
        .toLowerCase()
        .includes(search);

    const matchesType =
      type === "all" ||
      comic.item_type === type;

    const matchesStatus =
      status === "all" ||
      comic.status === status;

    return (
      matchesSearch &&
      matchesType &&
      matchesStatus
    );
  });

  if (sort === "oldest") {
    visible = [...visible].reverse();
  }

  if (sort === "title") {
    visible.sort((a, b) =>
      itemName(a).localeCompare(itemName(b))
    );
  }

  if (sort === "publisher") {
    visible.sort((a, b) =>
      (a.publisher || "").localeCompare(
        b.publisher || ""
      )
    );
  }

  return visible;
}

function renderComics() {
  if (!list) {
    return;
  }

  list.replaceChildren();

  const visible = getVisibleComics();

  if (!comics.length) {
    if (emptyMessage) {
      emptyMessage.hidden = false;
    }

    if (filterEmptyMessage) {
      filterEmptyMessage.hidden = true;
    }

    return;
  }

  if (emptyMessage) {
    emptyMessage.hidden = true;
  }

  if (!visible.length) {
    if (filterEmptyMessage) {
      filterEmptyMessage.hidden = false;
    }

    return;
  }

  if (filterEmptyMessage) {
    filterEmptyMessage.hidden = true;
  }

  visible.forEach((comic) => {
    list.append(createComicCard(comic));
  });
}

/* =========================================
   COLLECTION LOAD
========================================= */

async function loadComics() {
  if (!user) {
    comics = [];

    renderComics();
    renderDashboard();
    updateDashboardCounts();
    updateAccountPage();

    return;
  }

  const { data, error } =
    await supabaseClient
      .from("comics")
      .select(
        "id,user_id,item_type,series,issue,publisher,notes,status,cover_url,cover_path,created_at,updated_at"
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    console.error(
      "PanelShelf: failed to load comics:",
      error
    );

    comics = [];

    renderComics();
    renderDashboard();
    updateDashboardCounts();
    updateAccountPage();

    return;
  }

  comics = data || [];

  renderComics();
  renderDashboard();
  updateDashboardCounts();
  updateAccountPage();
}

/* =========================================
   DASHBOARD COUNTS
========================================= */

function updateDashboardCounts() {
  const total = comics.length;

  const owned = comics.filter(
    (comic) => comic.status === "owned"
  ).length;

  const reading = comics.filter(
    (comic) => comic.status === "reading"
  ).length;

  const wishlist = comics.filter(
    (comic) => comic.status === "wishlist"
  ).length;

  const totalCount = $("#total-count");
  const ownedCount = $("#owned-count");
  const readingCount = $("#reading-count");
  const wishlistCount = $("#wishlist-count");

  if (totalCount) {
    totalCount.textContent = total;
  }

  if (ownedCount) {
    ownedCount.textContent = owned;
  }

  if (readingCount) {
    readingCount.textContent = reading;
  }

  if (wishlistCount) {
    wishlistCount.textContent = wishlist;
  }
}

/* =========================================
   ACCOUNT PAGE
========================================= */

function updateAccountPage() {
  const total = comics.length;

  const owned = comics.filter(
    (comic) => comic.status === "owned"
  ).length;

  const reading = comics.filter(
    (comic) => comic.status === "reading"
  ).length;

  const wishlist = comics.filter(
    (comic) => comic.status === "wishlist"
  ).length;

  const totalCount =
    $("#account-total-count");

  const ownedCount =
    $("#account-owned-count");

  const readingCount =
    $("#account-reading-count");

  const wishlistCount =
    $("#account-wishlist-count");

  if (totalCount) {
    totalCount.textContent = total;
  }

  if (ownedCount) {
    ownedCount.textContent = owned;
  }

  if (readingCount) {
    readingCount.textContent = reading;
  }

  if (wishlistCount) {
    wishlistCount.textContent = wishlist;
  }

  const accountName =
    $("#account-user-name");

  const accountEmail =
    $("#account-user-email");

  const accountStatusText =
    $("#account-status-text");

  const accountStatus =
    $(".account-status");

  const sessionDescription =
    $("#account-session-description");

  const accountSignOut =
    $("#account-sign-out-button");

  const accountDelete =
    $("#account-delete-button");

  const settingsSignOut =
    $("#settings-sign-out-button");

  const settingsDelete =
    $("#settings-delete-button");

  if (!user) {
    if (accountName) {
      accountName.textContent = "Guest";
    }

    if (accountEmail) {
      accountEmail.textContent =
        "Not signed in";
    }

    if (accountStatusText) {
      accountStatusText.textContent =
        "Signed out";
    }

    if (accountStatus) {
      accountStatus.classList.remove(
        "is-active"
      );
    }

    if (sessionDescription) {
      sessionDescription.textContent =
        "You are currently signed out.";
    }

    if (accountSignOut) {
      accountSignOut.hidden = true;
    }

    if (accountDelete) {
      accountDelete.hidden = true;
    }

    if (settingsSignOut) {
      settingsSignOut.hidden = true;
    }

    if (settingsDelete) {
      settingsDelete.hidden = true;
    }

    return;
  }

  const email =
    user.email || "Collector";

  const displayName =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    email.split("@")[0];

  if (accountName) {
    accountName.textContent =
      displayName;
  }

  if (accountEmail) {
    accountEmail.textContent =
      email;
  }

  if (accountStatusText) {
    accountStatusText.textContent =
      "Signed in";
  }

  if (accountStatus) {
    accountStatus.classList.add(
      "is-active"
    );
  }

  if (sessionDescription) {
    sessionDescription.textContent =
      "You are currently signed in to PanelShelf.";
  }

  if (accountSignOut) {
    accountSignOut.hidden = false;
  }

  if (accountDelete) {
    accountDelete.hidden = false;
  }

  if (settingsSignOut) {
    settingsSignOut.hidden = false;
  }

  if (settingsDelete) {
    settingsDelete.hidden = false;
  }
}

/* =========================================
   SETTINGS
========================================= */

function loadSettings() {
  const themeSetting =
    $("#theme-setting");

  const collectionViewSetting =
    $("#collection-view-setting");

  const rememberFiltersSetting =
    $("#remember-filters-setting");

  if (themeSetting) {
    themeSetting.value =
      localStorage.getItem(
        "panelshelf-theme"
      ) || "panel";
  }

  if (collectionViewSetting) {
    collectionViewSetting.value =
      localStorage.getItem(
        "panelshelf-collection-view"
      ) || "grid";
  }

  if (rememberFiltersSetting) {
    rememberFiltersSetting.checked =
      localStorage.getItem(
        "panelshelf-remember-filters"
      ) === "true";
  }
}

function saveSettings() {
  const themeSetting =
    $("#theme-setting");

  const collectionViewSetting =
    $("#collection-view-setting");

  const rememberFiltersSetting =
    $("#remember-filters-setting");

  if (themeSetting) {
    localStorage.setItem(
      "panelshelf-theme",
      themeSetting.value
    );
  }

  if (collectionViewSetting) {
    localStorage.setItem(
      "panelshelf-collection-view",
      collectionViewSetting.value
    );
  }

  if (rememberFiltersSetting) {
    localStorage.setItem(
      "panelshelf-remember-filters",
      String(
        rememberFiltersSetting.checked
      )
    );
  }
}

/* =========================================
   ACCOUNT / SETTINGS ACTIONS
========================================= */

function openPasswordResetDialog() {
  if (!user) {
    alert(
      "Please sign in before changing your password."
    );

    return;
  }

  const dialog =
    $("#reset-password-dialog");

  if (dialog) {
    dialog.showModal();
  }
}

function openDeleteAccountDialog() {
  const deleteAccountButton =
    $("#delete-account-button");

  if (
    deleteAccountButton &&
    !deleteAccountButton.hidden
  ) {
    deleteAccountButton.click();
    return;
  }

  if (!user) {
    alert(
      "Please sign in before deleting your account."
    );
  }
}

const accountChangePasswordButton =
  $("#account-change-password-button");

if (accountChangePasswordButton) {
  accountChangePasswordButton.addEventListener(
    "click",
    openPasswordResetDialog
  );
}

const settingsChangePasswordButton =
  $("#settings-change-password-button");

if (settingsChangePasswordButton) {
  settingsChangePasswordButton.addEventListener(
    "click",
    openPasswordResetDialog
  );
}

const accountSignOutButton =
  $("#account-sign-out-button");

if (accountSignOutButton) {
  accountSignOutButton.addEventListener(
    "click",
    signOut
  );
}

const settingsSignOutButton =
  $("#settings-sign-out-button");

if (settingsSignOutButton) {
  settingsSignOutButton.addEventListener(
    "click",
    signOut
  );
}

const accountDeleteButton =
  $("#account-delete-button");

if (accountDeleteButton) {
  accountDeleteButton.addEventListener(
    "click",
    openDeleteAccountDialog
  );
}

const settingsDeleteButton =
  $("#settings-delete-button");

if (settingsDeleteButton) {
  settingsDeleteButton.addEventListener(
    "click",
    openDeleteAccountDialog
  );
}

const settingsExportButton =
  $("#settings-export-button");

if (settingsExportButton) {
  settingsExportButton.addEventListener(
    "click",
    () => {
      if (!user) {
        alert(
          "Please sign in before exporting your collection."
        );

        return;
      }

      exportCsv();
    }
  );
}

const themeSetting =
  $("#theme-setting");

if (themeSetting) {
  themeSetting.addEventListener(
    "change",
    saveSettings
  );
}

const collectionViewSetting =
  $("#collection-view-setting");

if (collectionViewSetting) {
  collectionViewSetting.addEventListener(
    "change",
    saveSettings
  );
}

const rememberFiltersSetting =
  $("#remember-filters-setting");

if (rememberFiltersSetting) {
  rememberFiltersSetting.addEventListener(
    "change",
    saveSettings
  );
}

/* =========================================
   VIEW NAVIGATION
========================================= */

function showView(viewId) {
  const views = $$(".view");

  views.forEach((view) => {
    view.hidden = view.id !== viewId;
  });

  const navButtons =
    $$(".sidebar-nav-button");

  navButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.view === viewId
    );
  });

  const pageTitle =
    $("#page-title");

  const pageTitles = {
    "home-view": "Dashboard",
    "add-view": "Add Comic",
    "collection-view": "My Collection",
    "account-view": "Account",
    "settings-view": "Settings",
  };

  if (pageTitle) {
    pageTitle.textContent =
      pageTitles[viewId] || "PanelShelf";
  }

  const radio =
    $(`#nav-${viewId.replace("-view", "")}`);

  if (radio) {
    radio.checked = true;
  }

  if (viewId === "account-view") {
    updateAccountPage();
  }

  if (viewId === "settings-view") {
    loadSettings();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

/* =========================================
   NAVIGATION BUTTONS
========================================= */

$$("[data-view]").forEach((button) => {
  button.addEventListener(
    "click",
    () => {
      const viewId =
        button.dataset.view;

      if (viewId) {
        showView(viewId);
      }
    }
  );
});

/* =========================================
   STATUS NAVIGATION
========================================= */

$$("[data-status-filter]").forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        const status =
          button.dataset.statusFilter;

        const statusFilter =
          $("#collection-filter");

        if (statusFilter) {
          statusFilter.value =
            status;
        }

        showView(
          "collection-view"
        );

        renderComics();
      }
    );
  }
);

/* =========================================
   COLLECTION SEARCH / FILTERS
========================================= */

const collectionSearch =
  $("#collection-search");

if (collectionSearch) {
  collectionSearch.addEventListener(
    "input",
    () => {
      renderComics();
    }
  );
}

const collectionTypeFilter =
  $("#collection-type-filter");

if (collectionTypeFilter) {
  collectionTypeFilter.addEventListener(
    "change",
    () => {
      renderComics();
    }
  );
}

const collectionFilter =
  $("#collection-filter");

if (collectionFilter) {
  collectionFilter.addEventListener(
    "change",
    () => {
      renderComics();
    }
  );
}

const collectionSort =
  $("#collection-sort");

if (collectionSort) {
  collectionSort.addEventListener(
    "change",
    () => {
      renderComics();
    }
  );
}

/* =========================================
   COVER SEARCH
========================================= */

async function searchCovers() {
  const seriesInput =
    $("#series");

  const issueInput =
    $("#issue");

  const suggestions =
    $("#cover-suggestions");

  const message =
    $("#cover-message");

  const button =
    $("#find-cover-button");

  if (
    !seriesInput ||
    !suggestions ||
    !message ||
    !button
  ) {
    return;
  }

  const series =
    seriesInput.value.trim();

  const issue =
    issueInput?.value.trim() || "";

  if (!series) {
    message.textContent =
      "Enter a series first.";

    suggestions.replaceChildren();

    return;
  }

  setLoading(
    button,
    true,
    "Find Cover"
  );

  message.textContent =
    "Searching for covers...";

  suggestions.replaceChildren();

  try {
   const { data, error } = await supabaseClient.functions.invoke(
  coverFunctionName,
  {
    body: {
      title: series,
      series,
      issue,
    },
  }
);

    if (error) {
      throw error;
    }

    const results =
      Array.isArray(data)
        ? data
        : data?.results || [];

    if (!results.length) {
      message.textContent =
        "No covers found.";

      return;
    }

    message.textContent =
      `${results.length} cover${
        results.length === 1
          ? ""
          : "s"
      } found.`;

    results.forEach(
      (result) => {
        const option =
          document.createElement(
            "button"
          );

        option.type = "button";
        option.className =
          "cover-suggestion";

        const image =
          document.createElement(
            "img"
          );

        image.src =
          result.cover_url ||
          result.url ||
          "";

        image.alt =
          result.title ||
          "Comic cover";

        const label =
          document.createElement(
            "span"
          );

        label.textContent =
          result.title ||
          "Select cover";

        option.append(
          image,
          label
        );

        option.addEventListener(
          "click",
          () => {
            const selectedUrl =
              result.cover_url ||
              result.url ||
              "";

            const selectedPath =
              result.cover_path ||
              "";

            const selectedCoverUrl =
              $("#selected-cover-url");

            const selectedCoverPath =
              $("#selected-cover-path");

            const preview =
              $("#cover-preview");

            if (selectedCoverUrl) {
              selectedCoverUrl.value =
                selectedUrl;
            }

            if (selectedCoverPath) {
              selectedCoverPath.value =
                selectedPath;
            }

            if (preview) {
              setCoverPreview(
                preview,
                selectedUrl,
                result.title ||
                  series
              );
            }

            $$(".cover-suggestion")
              .forEach(
                (item) => {
                  item.classList.toggle(
                    "selected",
                    item === option
                  );
                }
              );
          }
        );

        suggestions.append(option);
      }
    );
  } catch (error) {
  console.error("PanelShelf: cover search failed:", error);

  if (error?.context) {
    try {
      const responseBody = await error.context.json();
      console.error("PanelShelf: Edge Function response:", responseBody);
      message.textContent =
        responseBody?.error || "Could not search for covers.";
    } catch {
      message.textContent = "Could not search for covers.";
    }
  } else {
    message.textContent = "Could not search for covers.";
  }
  
  } finally {
    setLoading(
      button,
      false,
      "Find Cover"
    );
  }
}

const findCoverButton =
  $("#find-cover-button");

if (findCoverButton) {
  findCoverButton.addEventListener(
    "click",
    searchCovers
  );
}

/* =========================================
   COVER UPLOAD
========================================= */

const coverUpload =
  $("#cover-upload");

if (coverUpload) {
  coverUpload.addEventListener(
    "change",
    async () => {
      const file =
        coverUpload.files?.[0];

      if (!file || !user) {
        return;
      }

      const message =
        $("#cover-message");

      if (message) {
        message.textContent =
          "Uploading cover...";
      }

      try {
        const extension =
          file.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
          "jpg";

        const path =
          `${user.id}/${crypto.randomUUID()}.${extension}`;

        const { error } =
          await supabaseClient.storage
            .from(coverBucket)
            .upload(
              path,
              file,
              {
                upsert: false,
                contentType:
                  file.type ||
                  "image/jpeg",
              }
            );

        if (error) {
          throw error;
        }

        const {
          data: publicData,
        } =
          supabaseClient.storage
            .from(coverBucket)
            .getPublicUrl(path);

        const selectedCoverUrl =
          $("#selected-cover-url");

        const selectedCoverPath =
          $("#selected-cover-path");

        const preview =
          $("#cover-preview");

        if (selectedCoverUrl) {
          selectedCoverUrl.value =
            publicData.publicUrl;
        }

        if (selectedCoverPath) {
          selectedCoverPath.value =
            path;
        }

        if (preview) {
          setCoverPreview(
            preview,
            publicData.publicUrl,
            file.name
          );
        }

        if (message) {
          message.textContent =
            "Cover uploaded.";
        }
      } catch (error) {
        console.error(
          "PanelShelf: cover upload failed:",
          error
        );

        if (message) {
          message.textContent =
            "Could not upload the cover.";
        }
      }
    }
  );
}

/* =========================================
   ADD COMIC
========================================= */

if (form) {
  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!user) {
        alert(
          "Please sign in before adding a comic."
        );

        return;
      }

      const submitButton =
        form.querySelector(
          'button[type="submit"]'
        );

      if (submitButton) {
        submitButton.disabled = true;
      }

      const itemType =
        $("#item-type")?.value ||
        "comic_issue";

      const series =
        $("#series")?.value.trim() ||
        "";

      const issue =
        $("#issue")?.value.trim() ||
        "";

      const publisher =
        $("#publisher")?.value.trim() ||
        "";

      const notes =
        $("#notes")?.value.trim() ||
        "";

      const status =
        $("#status")?.value ||
        "owned";

      const coverUrl =
        $("#selected-cover-url")
          ?.value.trim() || "";

      const coverPath =
        $("#selected-cover-path")
          ?.value.trim() || "";

      try {
        const { error } =
          await supabaseClient
            .from("comics")
            .insert({
              user_id: user.id,
              item_type: itemType,
              series,
              issue:
                issue || null,
              publisher:
                publisher || null,
              notes:
                notes || null,
              status,
              cover_url:
                coverUrl || null,
              cover_path:
                coverPath || null,
            });

        if (error) {
          throw error;
        }

        form.reset();

        const preview =
          $("#cover-preview");

        if (preview) {
          preview.replaceChildren();
        }

        const suggestions =
          $("#cover-suggestions");

        if (suggestions) {
          suggestions.replaceChildren();
        }

        const coverMessage =
          $("#cover-message");

        if (coverMessage) {
          coverMessage.textContent =
            "";
        }

        showView(
          "collection-view"
        );

        await loadComics();
      } catch (error) {
        console.error(
          "PanelShelf: failed to add comic:",
          error
        );

        alert(
          "PanelShelf could not add that comic. Please try again."
        );
      } finally {
        if (submitButton) {
          submitButton.disabled =
            false;
        }
      }
    }
  );
}

/* =========================================
   DELETE STORED COVER
========================================= */

async function deleteStoredCover(
  coverPath
) {
  if (!coverPath) {
    return;
  }

  try {
    const { error } =
      await supabaseClient.storage
        .from(coverBucket)
        .remove([
          coverPath,
        ]);

    if (error) {
      console.error(
        "PanelShelf: failed to delete cover:",
        error
      );
    }
  } catch (error) {
    console.error(
      "PanelShelf: cover deletion failed:",
      error
    );
  }
}

/* =========================================
   REMOVE COMIC
========================================= */

async function removeComic(comic) {
  if (
    !confirm(
      `Remove "${itemName(comic)}" from your collection?`
    )
  ) {
    return;
  }

  try {
    const { error } =
      await supabaseClient
        .from("comics")
        .delete()
        .eq("id", comic.id)
        .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    if (comic.cover_path) {
      await deleteStoredCover(
        comic.cover_path
      );
    }

    await loadComics();
  } catch (error) {
    console.error(
      "PanelShelf: failed to remove comic:",
      error
    );

    alert(
      "PanelShelf could not remove that comic."
    );
  }
}

/* =========================================
   EDIT COMIC
========================================= */

function openEditDialog(comic) {
  const dialog =
    $("#edit-dialog");

  if (!dialog) {
    return;
  }

  const idInput =
    $("#edit-id");

  const itemTypeInput =
    $("#edit-item-type");

  const seriesInput =
    $("#edit-series");

  const issueInput =
    $("#edit-issue");

  const publisherInput =
    $("#edit-publisher");

  const notesInput =
    $("#edit-notes");

  const statusInput =
    $("#edit-status");

  const coverUrlInput =
    $("#edit-selected-cover-url");

  const coverPathInput =
    $("#edit-selected-cover-path");

  if (idInput) {
    idInput.value =
      comic.id;
  }

  if (itemTypeInput) {
    itemTypeInput.value =
      comic.item_type ||
      "comic_issue";
  }

  if (seriesInput) {
    seriesInput.value =
      comic.series || "";
  }

  if (issueInput) {
    issueInput.value =
      comic.issue || "";
  }

  if (publisherInput) {
    publisherInput.value =
      comic.publisher || "";
  }

  if (notesInput) {
    notesInput.value =
      comic.notes || "";
  }

  if (statusInput) {
    statusInput.value =
      comic.status || "owned";
  }

  if (coverUrlInput) {
    coverUrlInput.value =
      comic.cover_url || "";
  }

  if (coverPathInput) {
    coverPathInput.value =
      comic.cover_path || "";
  }

  const preview =
    $("#edit-cover-preview");

  if (preview) {
    setCoverPreview(
      preview,
      comic.cover_url,
      itemName(comic)
    );
  }

  dialog.showModal();
}

/* =========================================
   EDIT FORM
========================================= */

const editForm =
  $("#edit-form");

if (editForm) {
  editForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!user) {
        return;
      }

      const submitButton =
        editForm.querySelector(
          'button[type="submit"]'
        );

      if (submitButton) {
        submitButton.disabled =
          true;
      }

      const id =
        $("#edit-id")?.value;

      const itemType =
        $("#edit-item-type")?.value ||
        "comic_issue";

      const series =
        $("#edit-series")
          ?.value.trim() || "";

      const issue =
        $("#edit-issue")
          ?.value.trim() || "";

      const publisher =
        $("#edit-publisher")
          ?.value.trim() || "";

      const notes =
        $("#edit-notes")
          ?.value.trim() || "";

      const status =
        $("#edit-status")?.value ||
        "owned";

      const coverUrl =
        $("#edit-selected-cover-url")
          ?.value.trim() || "";

      const coverPath =
        $("#edit-selected-cover-path")
          ?.value.trim() || "";

      try {
        const original =
          comics.find(
            (comic) =>
              String(comic.id) ===
              String(id)
          );

        const { error } =
          await supabaseClient
            .from("comics")
            .update({
              item_type: itemType,
              series,
              issue:
                issue || null,
              publisher:
                publisher || null,
              notes:
                notes || null,
              status,
              cover_url:
                coverUrl || null,
              cover_path:
                coverPath || null,
            })
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) {
          throw error;
        }

        if (
          original?.cover_path &&
          original.cover_path !==
            coverPath
        ) {
          await deleteStoredCover(
            original.cover_path
          );
        }

        const dialog =
          $("#edit-dialog");

        if (dialog) {
          dialog.close();
        }

        await loadComics();
      } catch (error) {
        console.error(
          "PanelShelf: failed to edit comic:",
          error
        );

        alert(
          "PanelShelf could not update that comic."
        );
      } finally {
        if (submitButton) {
          submitButton.disabled =
            false;
        }
      }
    }
  );
}

/* =========================================
   EDIT DIALOG CLOSE
========================================= */

const editDialog =
  $("#edit-dialog");

if (editDialog) {
  editDialog
    .querySelectorAll(
      "[data-close-dialog]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          editDialog.close();
        }
      );
    });
}

/* =========================================
   FUNCTION ERROR
========================================= */

function getFunctionError(
  error
) {
  if (!error) {
    return "";
  }

  return (
    error.message ||
    error.error_description ||
    "Something went wrong."
  );
}

/* =========================================
   CSV EXPORT
========================================= */

function escapeCsv(value) {
  const stringValue =
    value == null
      ? ""
      : String(value);

  return `"${stringValue.replaceAll(
    '"',
    '""'
  )}"`;
}

function exportCsv() {
  if (!user) {
    alert(
      "Please sign in before exporting your collection."
    );

    return;
  }

  if (!comics.length) {
    alert(
      "Your collection is empty."
    );

    return;
  }

  const headers = [
    "Type",
    "Series",
    "Issue",
    "Publisher",
    "Status",
    "Notes",
    "Cover URL",
  ];

  const rows = comics.map(
    (comic) => [
      typeName(
        comic.item_type
      ),
      comic.series || "",
      comic.issue || "",
      comic.publisher || "",
      statusLabel(
        comic.status
      ),
      comic.notes || "",
      comic.cover_url || "",
    ]
  );

  const csv = [
    headers,
    ...rows,
  ]
    .map((row) =>
      row
        .map(escapeCsv)
        .join(",")
    )
    .join("\r\n");

  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    "panelshelf-collection.csv";

  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

/* =========================================
   LOADING SCREEN
========================================= */

function delay(ms) {
  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}

async function runLoaderSequence() {
  const screen =
    $("#loading-screen");

  if (!screen) {
    console.error(
      "PanelShelf: #loading-screen was not found."
    );

    return false;
  }

  screen.hidden = false;

  screen.classList.remove(
    "is-active"
  );

  void screen.offsetWidth;

  screen.classList.add(
    "is-active"
  );

  await delay(1400);

  return true;
}

async function hideLoaderSequence() {
  const screen =
    $("#loading-screen");

  if (!screen) {
    return;
  }

  screen.classList.remove(
    "is-active"
  );

  await delay(250);

  screen.hidden = true;
}

async function openAuthWithLoader() {
  const screen =
    $("#loading-screen");

  if (!screen) {
    console.error(
      "PanelShelf: #loading-screen was not found."
    );

    return;
  }

  await runLoaderSequence();

  window.location.href =
    "signin.html";
}

const openAuthButton =
  $("#open-auth-button");

if (openAuthButton) {
  openAuthButton.addEventListener(
    "click",
    openAuthWithLoader
  );
}

/* =========================================
   AUTH DIALOG
========================================= */

const authDialog =
  $("#auth-dialog");

const authForm =
  $("#auth-form");

const authModeButtons =
  $$("[data-auth-mode]");

let authMode = "signin";

function setAuthMode(mode) {
  authMode = mode;

  authModeButtons.forEach(
    (button) => {
      button.classList.toggle(
        "active",
        button.dataset.authMode ===
          mode
      );
    }
  );

  const submitButton =
    $("#auth-submit-button");

  if (submitButton) {
    submitButton.textContent =
      mode === "signup"
        ? "Create Account"
        : "Sign In";
  }

  const passwordHint =
    $("#auth-password-hint");

  if (passwordHint) {
    passwordHint.hidden =
      mode !== "signup";
  }
}

authModeButtons.forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        setAuthMode(
          button.dataset.authMode
        );
      }
    );
  }
);

const closeAuthButton =
  $("#close-auth-button");

if (closeAuthButton) {
  closeAuthButton.addEventListener(
    "click",
    () => {
      authDialog?.close();
    }
  );
}

const authMessage =
  $("#auth-message");

if (authForm) {
  authForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const email =
        $("#auth-email")
          ?.value.trim() || "";

      const password =
        $("#auth-password")
          ?.value || "";

      const submitButton =
        $("#auth-submit-button");

      if (submitButton) {
        submitButton.disabled =
          true;
      }

      if (authMessage) {
        authMessage.textContent =
          "";
      }

      try {
        if (authMode === "signup") {
          const {
            data,
            error,
          } =
            await supabaseClient.auth
              .signUp({
                email,
                password,
                options: {
                  emailRedirectTo:
                    redirectUrl(),
                },
              });

          if (error) {
            throw error;
          }

          if (data?.session) {
            window.location.assign(
              "index.html"
            );

            return;
          }

          if (authMessage) {
            authMessage.textContent =
              "Account created. Check your email to confirm your account.";
          }
        } else {
          const {
            data,
            error,
          } =
            await supabaseClient.auth
              .signInWithPassword({
                email,
                password,
              });

          if (error) {
            throw error;
          }

          if (data?.session) {
            window.location.assign(
              "index.html"
            );

            return;
          }
        }
      } catch (error) {
        console.error(
          "PanelShelf: authentication failed:",
          error
        );

        if (authMessage) {
          authMessage.textContent =
            getFunctionError(
              error
            );
        }
      } finally {
        if (submitButton) {
          submitButton.disabled =
            false;
        }
      }
    }
  );
}

/* =========================================
   RESEND CONFIRMATION
========================================= */

const resendConfirmationButton =
  $("#resend-confirmation-button");

if (resendConfirmationButton) {
  resendConfirmationButton.addEventListener(
    "click",
    async () => {
      const email =
        $("#auth-email")
          ?.value.trim() || "";

      if (!email) {
        if (authMessage) {
          authMessage.textContent =
            "Enter your email address first.";
        }

        return;
      }

      resendConfirmationButton.disabled =
        true;

      try {
        const { error } =
          await supabaseClient.auth
            .resend({
              type: "signup",
              email,
              options: {
                emailRedirectTo:
                  redirectUrl(),
              },
            });

        if (error) {
          throw error;
        }

        if (authMessage) {
          authMessage.textContent =
            "Confirmation email sent.";
        }
      } catch (error) {
        console.error(
          "PanelShelf: resend confirmation failed:",
          error
        );

        if (authMessage) {
          authMessage.textContent =
            getFunctionError(
              error
            );
        }
      } finally {
        resendConfirmationButton.disabled =
          false;
      }
    }
  );
}

/* =========================================
   FORGOT PASSWORD
========================================= */

const forgotPasswordButton =
  $("#forgot-password-button");

if (forgotPasswordButton) {
  forgotPasswordButton.addEventListener(
    "click",
    async () => {
      const email =
        $("#auth-email")
          ?.value.trim() || "";

      if (!email) {
        if (authMessage) {
          authMessage.textContent =
            "Enter your email address first.";
        }

        return;
      }

      forgotPasswordButton.disabled =
        true;

      try {
        const { error } =
          await supabaseClient.auth
            .resetPasswordForEmail(
              email,
              {
                redirectTo:
                  redirectUrl(),
              }
            );

        if (error) {
          throw error;
        }

        if (authMessage) {
          authMessage.textContent =
            "Password reset email sent.";
        }
      } catch (error) {
        console.error(
          "PanelShelf: password reset request failed:",
          error
        );

        if (authMessage) {
          authMessage.textContent =
            getFunctionError(
              error
            );
        }
      } finally {
        forgotPasswordButton.disabled =
          false;
      }
    }
  );
}

/* =========================================
   RESET PASSWORD
========================================= */

const resetPasswordDialog =
  $("#reset-password-dialog");

const resetPasswordForm =
  $("#reset-password-form");

if (resetPasswordForm) {
  resetPasswordForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const password =
        $("#reset-password")
          ?.value || "";

      const confirmPassword =
        $("#reset-password-confirm")
          ?.value || "";

      const message =
        $("#reset-password-message");

      const submitButton =
        resetPasswordForm.querySelector(
          'button[type="submit"]'
        );

      if (password !== confirmPassword) {
        if (message) {
          message.textContent =
            "Passwords do not match.";
        }

        return;
      }

      if (submitButton) {
        submitButton.disabled =
          true;
      }

      if (message) {
        message.textContent =
          "Updating password...";
      }

      try {
        const { error } =
          await supabaseClient.auth
            .updateUser({
              password,
            });

        if (error) {
          throw error;
        }

        if (message) {
          message.textContent =
            "Password updated successfully.";
        }

        setTimeout(
          () => {
            resetPasswordDialog?.close();
          },
          900
        );
      } catch (error) {
        console.error(
          "PanelShelf: password update failed:",
          error
        );

        if (message) {
          message.textContent =
            getFunctionError(
              error
            );
        }
      } finally {
        if (submitButton) {
          submitButton.disabled =
            false;
        }
      }
    }
  );
}

const cancelResetPasswordButton =
  $("#cancel-reset-password-button");

if (cancelResetPasswordButton) {
  cancelResetPasswordButton.addEventListener(
    "click",
    () => {
      resetPasswordDialog?.close();
    }
  );
}

/* =========================================
   SIGN OUT
========================================= */

async function signOut() {
  try {
    const { error } =
      await supabaseClient.auth
        .signOut();

    if (error) {
      throw error;
    }

    user = null;
    comics = [];

    updateAccountDisplay();
    updateAccountPage();
    renderComics();
    renderDashboard();
    updateDashboardCounts();

    showView("home-view");
  } catch (error) {
    console.error(
      "PanelShelf: sign out failed:",
      error
    );

    alert(
      "PanelShelf could not sign you out."
    );
  }
}

/* =========================================
   ACCOUNT SIDEBAR DISPLAY
========================================= */

function updateAccountDisplay() {
  const accountName =
    $("#sidebar-account-name");

  const accountEmail =
    $("#sidebar-account-email");

  const authButton =
    $("#open-auth-button");

  const signOutButton =
    $("#sign-out-button");

  if (!user) {
    if (accountName) {
      accountName.textContent =
        "Guest";
    }

    if (accountEmail) {
      accountEmail.textContent =
        "Not signed in";
    }

    if (authButton) {
      authButton.hidden =
        false;
    }

    if (signOutButton) {
      signOutButton.hidden =
        true;
    }

    return;
  }

  const email =
    user.email || "";

  const displayName =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    email.split("@")[0] ||
    "PanelShelf Member";

  if (accountName) {
    accountName.textContent =
      displayName;
  }

  if (accountEmail) {
    accountEmail.textContent =
      email;
  }

  if (authButton) {
    authButton.hidden =
      true;
  }

  if (signOutButton) {
    signOutButton.hidden =
      false;
  }
}

const signOutButton =
  $("#sign-out-button");

if (signOutButton) {
  signOutButton.addEventListener(
    "click",
    signOut
  );
}

/* =========================================
   START PANEL SHELF
========================================= */

async function startPanelShelf() {
  const {
    data: {
      session,
    },
  } =
    await supabaseClient.auth
      .getSession();

  user =
    session?.user || null;

  updateAccountDisplay();
  updateAccountPage();
  loadSettings();

  await loadComics();

  const { data } =
    await supabaseClient.rpc(
      "get_member_count"
    );

  if (data !== null) {
    const memberCount =
      $("#member-count");

    if (memberCount) {
      memberCount.textContent =
        data;
    }
  }

  supabaseClient.auth.onAuthStateChange(
    (event, session) => {
      user =
        session?.user || null;

      updateAccountDisplay();
      updateAccountPage();

      if (
        event ===
        "PASSWORD_RECOVERY"
      ) {
        $("#reset-password-dialog")
          ?.showModal();
      }

      loadComics();
    }
  );
}

/* =========================================
   MOBILE SIDEBAR
========================================= */

const mobileMenuButton =
  $("#mobile-menu-button");

const sidebar =
  $(".dashboard-sidebar");

const sidebarOverlay =
  $("#sidebar-overlay");

function closeSidebar() {
  if (sidebar) {
    sidebar.classList.remove(
      "is-open"
    );
  }

  if (sidebarOverlay) {
    sidebarOverlay.classList.remove(
      "is-visible"
    );
  }

  document.body.classList.remove(
    "sidebar-open"
  );
}

function openSidebar() {
  if (sidebar) {
    sidebar.classList.add(
      "is-open"
    );
  }

  if (sidebarOverlay) {
    sidebarOverlay.classList.add(
      "is-visible"
    );
  }

  document.body.classList.add(
    "sidebar-open"
  );
}

if (mobileMenuButton) {
  mobileMenuButton.addEventListener(
    "click",
    () => {
      if (
        sidebar?.classList.contains(
          "is-open"
        )
      ) {
        closeSidebar();
      } else {
        openSidebar();
      }
    }
  );
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener(
    "click",
    closeSidebar
  );
}

$$(".sidebar-nav-button").forEach(
  (button) => {
    button.addEventListener(
      "click",
      closeSidebar
    );
  }
);

/* =========================================
   GLOBAL DASHBOARD SEARCH
========================================= */

const dashboardSearch =
  $("#dashboard-search");

if (dashboardSearch) {
  dashboardSearch.addEventListener(
    "input",
    () => {
      const value =
        dashboardSearch.value
          .trim()
          .toLowerCase();

      if (!value) {
        return;
      }

      const match =
        comics.find(
          (comic) =>
            itemName(comic)
              .toLowerCase()
              .includes(value) ||
            (comic.publisher || "")
              .toLowerCase()
              .includes(value)
        );

      if (match) {
        showView(
          "collection-view"
        );

        const collectionSearch =
          $("#collection-search");

        if (collectionSearch) {
          collectionSearch.value =
            dashboardSearch.value;

          renderComics();
        }
      }
    }
  );
}

/* =========================================
   DELETE ACCOUNT
========================================= */

(() => {
  const deleteAccountButton =
    document.querySelector(
      "#delete-account-button"
    );

  const deleteAccountDialog =
    document.querySelector(
      "#delete-account-dialog"
    );

  const deleteAccountForm =
    document.querySelector(
      "#delete-account-form"
    );

  const deleteAccountConfirmation =
    document.querySelector(
      "#delete-account-confirmation"
    );

  const deleteAccountMessage =
    document.querySelector(
      "#delete-account-message"
    );

  const cancelDeleteAccountButton =
    document.querySelector(
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

  function updateDeleteAccountButton(
    session
  ) {
    deleteAccountButton.hidden =
      !session?.user;
  }

  deleteAccountButton.addEventListener(
    "click",
    () => {
      deleteAccountMessage.textContent =
        "";

      deleteAccountConfirmation.value =
        "";

      deleteAccountDialog.showModal();

      deleteAccountConfirmation.focus();
    }
  );

  cancelDeleteAccountButton.addEventListener(
    "click",
    () =>
      deleteAccountDialog.close()
  );

  deleteAccountDialog.addEventListener(
    "close",
    () => {
      deleteAccountForm.reset();

      deleteAccountMessage.textContent =
        "";
    }
  );

  deleteAccountForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (
        deleteAccountConfirmation
          .value
          .trim() !== "DELETE"
      ) {
        deleteAccountMessage.textContent =
          "Type DELETE exactly to continue.";

        deleteAccountConfirmation.focus();

        return;
      }

      const submitButton =
        deleteAccountForm.querySelector(
          'button[type="submit"]'
        );

      submitButton.disabled =
        true;

      deleteAccountMessage.textContent =
        "Deleting your account...";

      try {
        const { error } =
          await supabaseClient.functions
            .invoke(
              "delete-account",
              {
                body: {
                  confirmation:
                    "DELETE",
                },
              }
            );

        if (error) {
          throw error;
        }

        deleteAccountMessage.textContent =
          "Your account has been permanently deleted.";

        await supabaseClient.auth.signOut(
          {
            scope: "local",
          }
        );

        window.setTimeout(
          () =>
            window.location.assign(
              "index.html"
            ),
          1200
        );
      } catch (error) {
        console.error(
          "Account deletion failed:",
          error
        );

        deleteAccountMessage.textContent =
          "PanelShelf could not delete your account. Please try again.";

        submitButton.disabled =
          false;
      }
    }
  );

  supabaseClient.auth
    .getUser()
    .then(({ data }) => {
      updateDeleteAccountButton(
        data
      );
    });

  supabaseClient.auth.onAuthStateChange(
    (_event, session) => {
      updateDeleteAccountButton(
        session
      );
    }
  );
})();

/* =========================================
   INITIALIZE
========================================= */

startPanelShelf();