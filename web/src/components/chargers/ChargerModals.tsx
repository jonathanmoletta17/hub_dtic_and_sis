"use client";

import React, { useState } from "react";
import { X, Save, AlertCircle, Clock, Zap } from "lucide-react";
import type { OperationSettings, ChargerOfflineStatus } from "../../types/charger";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          width: 100%;
          max-width: 450px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .modal-header {
          padding: 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #f1f5f9;
        }
        .close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }
        .modal-body {
          padding: 1.5rem;
        }
      `}</style>
    </div>
  );
};

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: OperationSettings) => void;
  initialData?: OperationSettings;
  isGlobal?: boolean;
}

const ScheduleModalContent: React.FC<ScheduleModalProps> = ({
  isOpen, onClose, onSave, initialData, isGlobal
}) => {
  const [formData, setFormData] = useState<OperationSettings>(() => (
    initialData ?? {
      businessStart: "08:00",
      businessEnd: "18:00",
      workOnWeekends: false
    }
  ));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isGlobal ? "Configurar Expediente Global" : "Configurar Expediente do Carregador"}>
      <div className="form-group">
        <label>Início do Expediente</label>
        <div className="input-with-icon">
          <Clock size={16} />
          <input 
            type="time" 
            value={formData.businessStart} 
            onChange={e => setFormData({...formData, businessStart: e.target.value})}
          />
        </div>
      </div>
      <div className="form-group">
        <label>Término do Expediente</label>
        <div className="input-with-icon">
          <Clock size={16} />
          <input 
            type="time" 
            value={formData.businessEnd} 
            onChange={e => setFormData({...formData, businessEnd: e.target.value})}
          />
        </div>
      </div>
      <div className="form-check">
        <input 
          type="checkbox" 
          checked={formData.workOnWeekends} 
          id="work_weekends"
          onChange={e => setFormData({...formData, workOnWeekends: e.target.checked})}
        />
        <label htmlFor="work_weekends">Trabalha em Finais de Semana?</label>
      </div>
      
      <button className="save-btn" onClick={() => onSave(formData)}>
        <Save size={18} />
        <span>Salvar Configurações</span>
      </button>

      <style jsx>{`
        .form-group { margin-bottom: 1.25rem; }
        label { display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.5rem; }
        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          padding: 0 0.75rem;
          color: #94a3b8;
        }
        input[type="time"] {
          background: transparent;
          border: none;
          color: #f1f5f9;
          padding: 0.75rem 0;
          font-family: inherit;
          width: 100%;
          outline: none;
        }
        .form-check {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.5rem 0;
          cursor: pointer;
        }
        .form-check label { margin-bottom: 0; cursor: pointer; color: #cbd5e1; }
        .save-btn {
          width: 100%;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .save-btn:hover { background: #2563eb; }
      `}</style>
    </Modal>
  );
};

export const ScheduleModal: React.FC<ScheduleModalProps> = (props) => {
  const key = `${props.isOpen}-${props.initialData?.businessStart ?? ""}-${props.initialData?.businessEnd ?? ""}-${props.initialData?.workOnWeekends ?? false}`;
  return <ScheduleModalContent key={key} {...props} />;
};

interface OfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ChargerOfflineStatus>) => void;
  initialData?: ChargerOfflineStatus;
}

const OfflineModalContent: React.FC<OfflineModalProps> = ({
  isOpen, onClose, onSave, initialData
}) => {
  const [formData, setFormData] = useState<Partial<ChargerOfflineStatus>>(() => (
    initialData ?? {
      is_offline: false,
      reason: "",
      expected_return: ""
    }
  ));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Status de Operação">
      <div className="status-toggle">
        <button 
          className={!formData.is_offline ? "active-btn" : ""} 
          onClick={() => setFormData({...formData, is_offline: false})}
        >
          Disponível
        </button>
        <button 
          className={formData.is_offline ? "offline-btn" : ""} 
          onClick={() => setFormData({...formData, is_offline: true})}
        >
          Offline / Pausa
        </button>
      </div>

      {formData.is_offline && (
        <>
          <div className="form-group" style={{marginTop: '1.5rem'}}>
            <label>Motivo da Inatividade</label>
            <textarea 
              value={formData.reason} 
              onChange={e => setFormData({...formData, reason: e.target.value})}
              placeholder="Ex: Almoço, Manutenção, Afastado..."
            />
          </div>
          <div className="form-group">
            <label>Previsão de Retorno (Opcional)</label>
            <input 
              type="date" 
              value={formData.expected_return} 
              onChange={e => setFormData({...formData, expected_return: e.target.value})}
            />
          </div>
        </>
      )}
      
      <button className="save-btn" onClick={() => onSave(formData)} style={{marginTop: '1.5rem'}}>
        <Zap size={18} />
        <span>Atualizar Status</span>
      </button>

      <style jsx>{`
        .status-toggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          background: rgba(0, 0, 0, 0.2);
          padding: 0.25rem;
          border-radius: 0.5rem;
        }
        .status-toggle button {
          padding: 0.6rem;
          border: none;
          background: transparent;
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.85rem;
          border-radius: 0.4rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .status-toggle .active-btn { background: #10b981; color: white; }
        .status-toggle .offline-btn { background: #ef4444; color: white; }
        
        .form-group { margin-bottom: 1.25rem; }
        label { display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.5rem; }
        textarea, input[type="date"] {
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          padding: 0.75rem;
          color: #f1f5f9;
          outline: none;
          font-family: inherit;
        }
        textarea { min-height: 80px; resize: vertical; }

        .save-btn {
          width: 100%;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          cursor: pointer;
        }
        .save-btn:hover { background: #2563eb; }
      `}</style>
    </Modal>
  );
};

export const OfflineModal: React.FC<OfflineModalProps> = (props) => {
  const key = `${props.isOpen}-${props.initialData?.is_offline ?? false}-${props.initialData?.reason ?? ""}-${props.initialData?.expected_return ?? ""}`;
  return <OfflineModalContent key={key} {...props} />;
};
