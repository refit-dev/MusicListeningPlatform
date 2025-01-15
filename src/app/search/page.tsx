import getSongsByTitles from "../../actions/getSongsByTitles";
import Header from "@/components/Header";
import SearchInput from "@/components/searchInput";
import SearchContent from "./components/SearchContent";

interface SearchProps {
  searchParams: {
    title: string;
  };
}

export const revalidate = 0;
const Search = async ({ searchParams }: SearchProps) => {
  const songs = await getSongsByTitles(searchParams.title);
  return (
    <div className="bg-neutral-900 rounded-lg h-full w-full overflow-hidden overflow-y-auto">
      <Header className="from-neutral-900">
        <div className="mb-2 flex flex-col gap-y-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Search</h1>
          <SearchInput />
        </div>
      </Header>
      <SearchContent songs={songs} />
    </div>
  );
};

export default Search;
