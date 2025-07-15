import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      <Card className="max-w-sm text-center">
        <CardHeader>
          <CardTitle>404 - Page Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </CardContent>
        <CardFooter>
          <Link href="/">
            <Button variant="outline">Go back home</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
} 