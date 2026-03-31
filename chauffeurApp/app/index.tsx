import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    setTimeout(() =>{
    router.replace("/(auth)/welcome");
    }, 0);
  }, []);

  return null;
}