import { useState, FormEvent } from 'react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { QRCode } from '../components/QRCode';
import { Alert } from '../components/Alert';
import { apiService } from '../services/api';
import type { GeneratePasswordResponse } from '../types';

export const GeneratePassword = () => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<GeneratePasswordResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResponse(null);
    setIsLoading(true);

    try {
      const result = await apiService.generatePassword({ username });
      setResponse(result);
      setUsername('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Générer un Mot de Passe"
        description="Créez ou mettez à jour un compte utilisateur avec un mot de passe sécurisé généré automatiquement."
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nom d'utilisateur"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Entrez le nom d'utilisateur"
            required
            autoFocus
            aria-required="true"
          />

          <Button type="submit" isLoading={isLoading} className="w-full md:w-auto">
            Générer le Mot de Passe
          </Button>
        </form>

        {error && (
          <div className="mt-6">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        {response && (
          <div className="mt-6 space-y-4">
            <Alert type="success">
              {response.message}
            </Alert>
            <div className="pt-4 border-t border-gray-200">
              <QRCode
                data={response.qr_code_base64}
                alt="QR Code contenant le mot de passe"
                title="QR Code du Mot de Passe"
              />
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Important :</strong> Le QR code contient votre mot de passe en clair. 
                  Scannez-le et conservez-le en lieu sûr. Vous en aurez besoin pour vous authentifier.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title="Comment ça fonctionne ?">
        <div className="space-y-4 text-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">1. Génération sécurisée</h3>
            <p>
              Un mot de passe complexe de 24 caractères est généré automatiquement avec des lettres majuscules, 
              minuscules, chiffres et caractères spéciaux.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">2. Stockage sécurisé</h3>
            <p>
              Le mot de passe est hashé avec bcrypt avant d'être stocké en base de données. 
              Seul le QR code contient le mot de passe en clair.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">3. QR Code</h3>
            <p>
              Un QR code est généré pour faciliter la sauvegarde du mot de passe. 
              Vous pouvez le scanner avec n'importe quelle application de lecture de QR code.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

