const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },

  {
    timestamps: true,
  },
);

const Setting = mongoose.model("Setting", settingSchema);

module.exports = Setting;
