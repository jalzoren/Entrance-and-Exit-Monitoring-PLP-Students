import React, { useState } from "react";
import { MdClose } from "react-icons/md";
import "../componentscss/AddUser.css";

function AddUser({ onClose }) {

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    const newUser = {
      lastName,
      firstName,
      middleName,
      username,
      role,
      password
    };

    console.log("User Data:", newUser);

    // connect to API later
    onClose();
  };

  return (
    <div className="popup-overlay">

      <div className="register-container">

        {/* HEADER */}
        <div className="register-header">
          <div className="register-text">ADD USER</div>

          <div className="register-close-btn" onClick={onClose}>
            <MdClose />
          </div>
        </div>


        {/* FORM */}
        <div className="register-form">

          {/* ROW 1 */}
          <div className="form-row">

            <div className="input-group">
              <label>Last Name</label>
              <input
                type="text"
                placeholder="e.g. Dela Cruz"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="e.g JuanDelaCruz"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

          </div>


          {/* ROW 2 */}
          <div className="form-row">

            <div className="input-group">
              <label>First Name</label>
              <input
                type="text"
                placeholder="e.g Juan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">Select Role</option>
                <option value="EEMS Admin">EEMS Admin</option>
                <option value="EAMS Admin">EAMS Admin</option>
              </select>
            </div>

          </div>


          {/* ROW 3 */}
          <div className="form-row">

            <div className="input-group">
              <label>Middle Name</label>
              <input
                type="text"
                placeholder="e.g Smith"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

          </div>


          {/* BUTTONS */}
          <div className="form-actions">

            <button
              className="btn add"
              onClick={handleSubmit}
            >
              Add
            </button>

            <button
              className="btn cancel"
              onClick={onClose}
            >
              Cancel
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default AddUser;