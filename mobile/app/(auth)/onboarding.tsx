import { useState } from 'react';
import { Button, Card, ErrorText, Input, Muted, Screen, Title } from '../../components/ui';
import { useAuth } from '../../lib/auth';

export default function Onboarding() {
  const auth = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await auth.updateName(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save name.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>What should we call you?</Title>
      <Muted>Other players will see this name in your games.</Muted>
      <Card>
        <Input
          label="Display name"
          placeholder="Alice"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <ErrorText>{error}</ErrorText>
        <Button
          label="Continue"
          onPress={submit}
          loading={loading}
          disabled={name.trim().length < 2}
        />
      </Card>
    </Screen>
  );
}
