import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true }, // e.g., "Sales", "Telecaller"
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    
    // Link to the specific Project/Company
    project: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Project", 
      required: true 
    },

    // Toggle to easily disable an employee without deleting them
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Employee = mongoose.models.Employee || mongoose.model("Employee", employeeSchema);
export default Employee;