import { useState } from 'react';

interface QRCodeProps {
  data: string;
  alt?: string;
  title?: string;
}

export const QRCode = ({ data, alt = 'QR Code', title }: QRCodeProps) => {
  const [imageError, setImageError] = useState(false);

  if (!data) {
    return null;
  }

  const handleImageError = () => {
    setImageError(true);
  };

  if (imageError) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg">
        <p className="text-gray-500">Impossible de charger le QR code</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}
      <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
        <img
          src={`data:image/png;base64,${data}`}
          alt={alt}
          className="w-64 h-64 md:w-80 md:h-80"
          onError={handleImageError}
          loading="lazy"
        />
      </div>

    </div>
  );
};

