import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  description?: string;
}

export const Card = ({ children, title, description, className = '', ...props }: CardProps) => {
  return (
    <div
      className={`bg-white rounded-xl shadow-lg p-6 md:p-8 ${className}`}
      {...props}
    >
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          )}
          {description && (
            <p className="text-gray-600">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

