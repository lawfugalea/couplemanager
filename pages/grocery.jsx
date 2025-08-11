export async function getServerSideProps() {
  return { redirect: { destination: '/shopping', permanent: true } };
}
export default function Page(){ return null; }
