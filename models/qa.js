import mongoose from "mongoose";

const intakeSchema = new mongoose.Schema(
  {
    formData: { type: Object, required: true },
  },
  { timestamps: true }
);

const Intake = mongoose.models.Intake || mongoose.model("Intake", intakeSchema);
export default Intake;
