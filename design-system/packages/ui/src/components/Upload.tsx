import type { ReactNode } from "react";

export interface UploadFile {
  id: string;
  name: string;
  size: string;
  status?: ReactNode;
}

export interface UploadProps {
  action?: ReactNode;
  description: ReactNode;
  files?: UploadFile[];
  icon?: ReactNode;
  title: ReactNode;
}

export function Upload({
  action,
  description,
  files = [],
  icon = "↑",
  title
}: UploadProps) {
  return (
    <div className="yza-upload">
      <div className="yza-upload__dropzone">
        <div className="yza-upload__icon">{icon}</div>
        <div className="yza-upload__title">{title}</div>
        <div className="yza-upload__description">{description}</div>
        {action ? <div className="yza-upload__action">{action}</div> : null}
      </div>
      {files.length ? (
        <div className="yza-upload__files">
          {files.map((file) => (
            <div className="yza-upload__file" key={file.id}>
              <div>
                <div className="yza-upload__file-name">{file.name}</div>
                <div className="yza-upload__file-meta">{file.size}</div>
              </div>
              {file.status ? <div>{file.status}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
