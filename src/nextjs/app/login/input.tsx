import React from "react";
import styled from "styled-components";

interface FloatingInputProps {
  label: string;
  type?: string;
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  autoComplete?: string;
  className?: string;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  type = "text",
  name,
  value,
  onChange,
  required = false,
  autoComplete = "off",
  className,
}) => {
  return (
    <StyledWrapper className={className}>
      <div className="input-group">
        <input
          required={required}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="input"
        />
        <label className="user-label">{label}</label>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .input-group {
    position: relative;
    width: 100%;
  }

  .input {
    width: 100%;
    border: none;
    border-radius: 0;
    background: #f5f5f5;
    padding: 1rem 1rem;
    font-size: 0.95rem;
    color: #333;
    transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
  }

  .input:focus {
    background: #eeeeee;
  }

  .user-label {
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
    pointer-events: none;
    transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .input:focus ~ .user-label,
  .input:valid ~ .user-label {
    top: -8px;
    transform: translateY(0) scale(0.85);
    background-color: #ffffff;
    padding: 0 0.4em;
    color: #666;
  }

  .input:not(:placeholder-shown) ~ .user-label {
    top: -8px;
    transform: translateY(0) scale(0.85);
    background-color: #ffffff;
    padding: 0 0.4em;
    color: #666;
  }
`;

export default FloatingInput;