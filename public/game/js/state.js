/** Friends SPA mutable client state (single source of truth). */
import { DEFAULT_SETTINGS } from "./lib/constants.js";

export const state = {
  user: null,
  bootError: "",
  activeTab: "start",

  view: "home",
  createDraft: { name: "", ...DEFAULT_SETTINGS },
  joinDraft: { code: "" },
  modal: null,

  roomCode: null,
  room: null,
  members: [],
  captures: [],
  chats: [],

  gameTab: "status",
  specTab: "stats",
  capturedAcknowledged: false,

  dispersalChosenSide: null,
  roleRevealUntil: null,
  roleRevealRole: null,

  camera: null,
  cameraOpen: false,
  cameraError: "",
  cameraKind: null,

  photoPreview: null,

  scannerOpen: false,
  scanner: null,
  scanError: "",

  toast: null,

  busy: false,
  joinError: "",
  createError: "",
  permissionState: "unknown",

  chatDraft: "",
  teamChatDraft: "",
  dispersalChatDraft: "",

  friends: [],
  friendRequests: [],
  addFriendDraft: "",
  addFriendError: "",

  createPhase: null,
  createdCode: null,
  createdName: "",
};
