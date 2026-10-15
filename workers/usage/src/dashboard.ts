// GET /dashboard?key=…: a private page with charts of the usage figures. It reads /usage.csv with the same
// key and draws everything in the browser (plain SVG, no external scripts), so it needs no upkeep. The world
// map: Natural Earth 1:110m country outlines (public domain) via world-atlas 2.0.2 (ISC), keyed by ISO
// alpha-2 code, equirectangular, 84° N to 58° S (src/worldpaths.json).
import WORLD from "./worldpaths.json";

/** the lab icon (app/public/favicon-32.png, favicon.ico) for the pages of the counter */
export const ICON_PNG_BASE64 = "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";
export const ICON_ICO_BASE64 = "AAABAAMAEBAAAAAAIACuAwAANgAAACAgAAAAACAAWgoAAOQDAAAwMAAAAAAgABcSAAA+DgAAiVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADdUlEQVR4nG2TbUxbZRTHz/Pcl/bS0rK22K4UWQeMolDHUEKNy+ZL0BmW6OJmBLJoZkKMTv3gXMyytHycuhk/mJgZvy5BMM5ljsS5uGwhMy4Tx4pACtcxLpFC7Rv3tr339j6PuVXqPux8ODk5yfmdk/zPHwAAIkffO9XQ0xBACDbj/+q+iEYBU0rRR30QOnak8azZw2ZqirzQt+vwxycoBeju768BAPpAyN4oRgjRhWcOvyl1feA2W6yZVGzdeMyFBmiAX7147dfEdq/3JzGZXPtvAYlGo9i/388MPz6shwZ73odIePjvOw3nq4CiTtLb5US2tTfwobi4RVTz2d2QTL5FqXkTMAghA0aADL06cETZ5/nE6uRSOTmVrwJoSV7h1sXeNp9g7Adb2yWR6wh38A6E0BAAGF1tjf6j744cm7L/NVzoQERViaASLVUFsGI8/tCGeKCsUPpiQyYxlWMCuhEcOP3p60FHbW2puaN7Vylx0xmembhVbtmtCWrKWUqll6qArHxdurynM8+W0WoLt7b6dvP01mXaDTt7+yIEKKxMTwJ/46wS4pE7NPvDOuJR8EdlTb2wCcipemrB693BO4XinNa09WWutNAijbt+G51nLYbh8+T+KHpsgrXAMwWmBvkUxRBmJSbxr4wIID5+ZQYy8pJF04lQ1pzfNz7lUpP1f+7cuONu1eZLbocdaQRTli0bNijVqvmidOWGNGfqjKOEYkhDvpCRfweWsTHEKAJC3umHmz2Iclhnayw6oSxPDKzYrKtT9e3Lk4b/UjoNeUKjGF+N7a08kyKufVfQDFmptQNv6PZEu18oWfhZxjDSuExkmbcsfPvs897L7ifarxZ8v1T+KgbYvAIhBDTsgLo3hp6c4Du93OQjEZXXbcXBe187qIHr2LJBksKWpbGu/jARV5ib73wVklY20kApMrfT0VcOMrdzkFVn7k7gpN+hZ/a5LLmgj8NaE7KgbWU7sy0A6z17Fifle/PrpyUpnz44OsqYsxUVDo2NkSil+DhqPfX0a8+9FHDZuyCl3qYUNGqABkCL1Cp47PH43Vsn5z+n1PTEIVI1k0kaicUAoUU1O/bFYGouvsQwfB3HAmJ5hDgOe8RlRfzm59wgwqgUi41UZh7k1wqwvrev5cDJ41+eO/OodO5MZ+azEzvGe8LO4Kal7x/5B9VCirbPeA3tAAAAAElFTkSuQmCCiVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAKIUlEQVR4nK1Xa3BV1RVea59z7j333uQmJORFAiGGPHgYqEGUp4CooBQwkABqx0odbDt2pv3hTKfWBvzh1NpWO9PqUK22TquQC1VKRVFIYBCL1giBJIA8QxLIO/fe3Md57b06+yRRUKz0sWbuPfuc/Vjf2vtb3zoHoLpaAQDIv2nmxgnzp/4coFCH2loGAAj/P8O6ET/3rczfU7Ms+xeyXXvbbSrUNjSo8mb+j57csq7ujY896bACEWEEhDv5fwVTVw0KMoRVizJ//Nbz5eEHqwp+5j6vq1ZGnYCVjCr5UxdWzn30qRVEVECbNtFIl7yOtv8bY9V1JDyCiqeVp047cMNTh95X702RHSGohs8AkBCmlYxB+dLqB4rvqX4YESnnhhuyPR5PKQC4E/4bq66rRrnW5O8vfvrTh34SPZcsXpgepDGyrycrC9n+UQDcscBxwPH47W9Nz5w9fYyyKXJpwJeSohdmZmYuAgD9Pz2Kyo2VWmjtdp5WmvfDkrVzV+tqcrzCk0OOZSfcAfsBmPyTxk0rzlQFTNvpvV1pc1bdPL7WEtYDAZ9/mq7rC8eOHbtk5CjYdTmvrNQaX2y0gWhlefXsZwK56ZaVSBKR4JxzY3jUfrnYMAI7EY0SMvDb8V6z91Lm4rJMe+WsSZuEnl6pqSw7PT390by8vJsAQACAy+ivsi1btmiNjY321OziRfPuu+u1oqqZCSucZOgBr3AsW1hmbHSsOtqwo9EByyFIi13uV+1kGXnSnbUlwjFTJ65v77x0yjQMIxgMPq0oytqOjo6BkZ2QYD6z6upqpa6ujhDRXjJ/4T1Tbqqoa1+kg6IojrA4Mo004VimnTQiVxzBfrdthnsHk/E45PS2JhWEMYYAPj6FxCxfr5lfVFLu9+klXq93XkZGxisVFRXZREQbN27Uamtr1YaGBlVRFAiFQhwRxfr71z+2YcOGv/eWMqYWBk2RsFVgTG6wh1sJw4kN9Y8egXogO9tNMWuwb2BooM/K625mDtMCKlDSIJUtyLHMk6cu6FZOfkq0v8tmirZCCFGBiFMAICnnbt68WV7Y9OnTl1Strnq8akXVgpf37mgbvNmXnm0zj4OOAwKlGOh2MmoY0UifnCB9qxAKuQDi/f0DdmSgLWPoYipXNSSZmATCq3n9K8cnjv/yRF8eY1qW4I7jcDFx3bp1rweDwUO2bWNWVlZRXl7e3LLS0hsrvlEJu//6ulN84KVLdOvDh9oYq1ZQF0TEbY8O0bjRnbjc4wKQviUHXADhcLgfzrW2pA32TDE4acB5gBioloVWUWWgcX1BZOUfd/oEolALJxSIRx55ZGVXV9dKzjmUlpZCeloaMEWhffX1IrLv98l5RTm3lv1pp6hfNeu5ADNLVNPiY7zc+Lijy3j/8uVOKbZEMAxASi8RDQy01be2zJpoQCTe6rU5eBwnxWOYzZCSmDNnXFrGYHgoipkPBFffew871nTEKZ5UIgkGx5qOwuw5c1lL66es481nzAX5HhETzAIGOcsuHipDH1sqBMS8XiWjjw00ASS6GSJwIhcArBHblBDWJIwCvWT3otnfJEf0EgAxILJQTV91ur55UrRz6p3zfXj05Dvxxk8K9LRgupqdnSWjgNSMLDh0+EPq3/NCYl4Wd0zwIpJQScHuZEDPYgiqzBlOSF2DeEIG7Wxdo2BNiLsAejb9zlW4ZEe4xTuUqGYqSyNBmnzmY3bhrokLPetPv7Ujx4ysv3FSxDjd9gy+835xZ9v5+dlMAe3sxwfsaXTBnDOWCUfxIgkhZI6SSjFFgXxw0GGMwLYJe/oMCQA2tfS4PlWXja3DmdB3orMpOZggf266EMJ2ABGQYNBP5o3bSpbFNpx4Y2dQce6eWoxvjmtvZV0ftdxBCMbyoEYpKQE0OCAKAXJ7SYAgnRIIkCYJqCiM9Q1adOp8rEn6am094Ppko2yUznoazx5L9EUjTGUqEboDSIIkiHiFM+cv5XdnJDrFr+P1vCigpC8vL8gQk/MzwOtPQcMhQHke7iRCFGRRAGwACEidYwqwgbAVPnoidlwSMBQaJj8bETEh6zUAtMUvD54mIl3SclThCEFRhIiamj7no2BFoZ+cKQ5SwrA4yJ8Q4qoqJccTQQJTEQlZKgFomoLBrj7rnPQhBOGoirLRSQv2PiGPg4fP9HwgTEdFhV0lsxyRvJbtOTW1KI8jNCGQX2aSjOYaxgAwqasG89lGRCfnZCTGj7ScNd6WS4VCNZ/5ZaONA8+3uhF3HT75XrwnIpimXv0aglJMhZnw+8ra83LbVIe7Gz0c8JUjkQOBF4Fferfk1tM7Jiz+8NVpVd2/SV/M/nacXN2vCYWuRDpioZBAxqCvufPg0IXedoYQRCEEkrtVo3ywVM5zG2dM5qrjDBLDNADwEoIHEWWFZIKBrhtm/8HZM1qbc8t/0Knn3GH4AkvNzr5c8+KlRveoQ58XMTbakOuv2bpVAYRo95ELO+McBkxdZ4KxVCZAByGpxcgjSGsvyK0Y0vy7mSXOgoPnwYIusihMHGOaIfjFcbn1TTMmz0kxkpqGIipiBnUfadshBXcN3yaB0pfKsbRQTY17pt1bG169j8UmqbfPGGgel5c5NCZtvMe2S1RuCA5wwW/zJuUW4QGOHcQhQTYIFOBwG5kvbvbtnX9LQicoFwgDiq55Bs902W3vHfmz6wNr4EpTr7oDSehahrj5aOxM15hV2kcLZ3HljBlQuj6cXrazpWhJHiXKsgsjx3r9kPi26U0JInGOPiBAECoIboLXs7p97+5XfKsaVMLbGBHvbjx/cKht8HAtEduMyK90yL4AAGpws9wEXney/8kLFvr9arIghpnxdu+DM1i4YoUCweWWqhcj8LDUdxAYQ4Fx5JgEDrbgLJ7CzWU1p3d32qmpR5LdEe38rn/+ChBpc03Nl3JG/eKDkJRsyW/Ed/Y0975W/J3HtH8ULp0ScGJTFGHELAcNBYRJiCrKAJA+Fww3IiITNSPXCq+4q+3gnufeTp7ta+7cPbIm/1oA0uRIZIxePkJPLopnfVLITNWwrbD7eYFuWXHV7lrvyAQgawFXUv2affjYna2//XQmY+iuea3vCwbXNiEzgtmXTrVt/8PjQ709Hs3vJxJi2MPwmGtKkHyL8euM9/SZ/u37BjYjwzNbV5Nk/lXC9nUAIFRTw1dvq1POHap/rnXHqy/ZiUSGpvsc4VY6WXW+HI7gRD5dsRNJkbF11+UXGz7oe3bb1jVKTUhu2bVN/aqOERBihLnfZUxRplTd/5Ane6KthMkR5IbkYpA0YAoTgYDi6R+0g6/vuvzytt3d3yNyM+qakV8XAAAgmRPyDRgRN8R6Oo4VLX/wiQnj4qm6h3mBMcThsqnFE9x7/NRQ76763p/u+2Dg2RHSuWv8OwfX+6mFtUQyQWU0ZTPnllctm2Gsy0jzFhAQDUadrhNn4+9uf7v7BQA4PRL5dX3U/gvp7TBdiEhpiwAAAABJRU5ErkJggolQTkcNChoKAAAADUlIRFIAAAAwAAAAMAgGAAAAVwL5hwAAEd5JREFUeJzFWQl0nWWZft/v+5e7JTe5ud2hS7pvtqEUCl0SKthSodqBhqWICjgcUcpxdOYoh6FU0WHm6BlAQGdQECgtNIhAFRyKSgptLRW6h27atGnSbDfJvbnLv3zf9875/qQlXUlHRt9z/t7TP//9v+d59/e9AD3CAPWHOb10zIBXS0YNvCW4uxQ4/J1lKQBHBIiF+XVXVyZbDcOY2fsn9tFTlZWG/kiMHn/3DatfeWnql+Y+Ex0Un99D6u9KgnEWgJj6rTtGta1/9mJKxs2v9EAG4xQWAMLLi+Lk6Ovmf+sXneEkXxpJDhgMRAqgl8rfVpBoBUhF9pIFg164cUG8qL6+6zeCm662SG0t0GkEABh5TjehKLpz1le+n863tS1Azun05/7/ZelSYIx9V00daa+46cq4dzB57bfXDHiEQ/yCItKIKisDpZ4MTCGRUujlM6HyeZ+/fcK11VNIqYsYY7LPs/bfgBB76ZcoiaiiuGJkcvu1D91b49z69WRZaKFwcv5JD/b9DwnPh4AeetLNJyu/+UC1kRi4SCllVFZWMsuKTQyHw1MjkcjUeDxe0utan7R74dK1a5EUwcjPTPv+hffdevO+xrZPR9G1ne60Ur4QZyXgu66rhK8hMZKSWFEi9e3LyyYMLTK/v3v37rBliaQQwiWikO/7ozXn3uuTkxlgvHTjDdKKhe6dcMvcqy3bsDl1KwU8D0RMeZ7T9/EgkqF2YADCd/MF6fuAyBSzTSPTmTp09xiWaOkcsuzJjUdaRgyKv5y1jctt2y4nIqOoqIi3tLRs7X3XJ0HEYNuZr5T63NjrZz04eNaYDqc9XQJm2ELJXCUE+E6u0IO5tm8Q1wT/ykIhL11X+wQKQijLNDR3Zv0R1dMHuWOHlKxsSKvrYpHQeEQsJiIlpbw8Go0O7AX/18aFgYhCSXVxYsyQVVPv/HTOS+eBGTqRShMZBN4hPS/f90snDkWdmwCyvpMHBDJc15MXHHs/5yIfGrW5e+eswXzC2PJ/c32/VCnlRKPRT5WWli4aNGjQnSNGjAj9NfFQWVlpMGSCiMZPnzzt1xXfWGRa8bBQvmSgcTFhAaCrlasxBvdOIUC9N7u9fE4Zlq0t0HLB0a02GFZxtytp1rCQO2eYAVNmzFpmmfwybppDACCslLrU9/3PaQP+X6wwY8YM89133xWK1Pgv33jrW8MWTkkOmDM656cdA7l+HQKhsBHR9Z3Ae7p7lX1KHeglIPK5ArdDAErVl3YeHgDcZIwUSW7xK5PZXAnzExOnTJvvOYUQ54YdjUbHlpSU3Dt27NhpmoTWZj+xsxUrVhgffPCBL6W87IF/XVGbGD34Amd2Im2RYRIG6TCAiahsRPJEIa9TaKavoU9YoPdWxs1ls2BaYDsdh20/e6EEphgiOr6E4QPifIJTlykuSbAZF100HYAmcs6TjLEhnPP/mjBhwpDa2lrxMZZATZJzrlauXCnC4fCXH3300bcmj5s4aIN5sGvYhJGml3d6XJp6YBGSTQGBgjZBphf/qZW4xwJ+NpPxFUBZ6/5WQLyQADwCYhy1fylYMD4BVtO2QtYHlkyUxgzDiBiGYUcikYuj0ei706dPv16XRO0ave/XF9eg165dyznnpElKKS+cP3/+qmeefeapqyrnRx7bsMobdc1FIDIO9rjOcdWSdqIQkfC9Qq5bY+yrjePmJil81H7mZTOZfDZL4xu3uIqbAxiQdyI4iUBxE5eMdN3/3HUgPGjURGg51mTnCwXto8QYK0fEtZdeemn5li1b6hljQETBVVtbG1wAMLyiouK2xYsXf/2aa64pGzp0qPrn79z7F1hSriLcGuP4bgYRuW6FNHLtlohgke/6fjbbqbP9ccx9CUB1j6akl810+o7bNqx5Z1RxKwJEXcc7Um1V1xc0LBGzrx3SefD5Q8cSJWFIEBFp9lJKYZqmkU6nHwSAZ5RSHdoaAJCcMGHC5GnTpl2hr3nz5hUlEgmwbVs8t3o1jql/Qy1Qn3/sZaJ7YgxHEZGDQMGZzDQ5SiwVTrrTy3W36Xv3C8FWIqqTCLQ+8ECgZTeXbRHdXfWlTirpmyEJpAH0xL3GyRiqTF7yhbPjT+/f1Xjb5h2liViEgyIEztHo6uqi5cuXLxs9evSy3bt3B98sLy+HsrKy4DJNE7LZrCAp+Ob39xmH1v0k+6UZw8v91zd/4/JpmR//cc6M25mkuELIE4GHijGyInXd3epArrVVZz6oq645EcUfZYy33w4+uruzh1j9zrjF5HQwDe75olQnAgJQxJgMm8zMdcvXm4fRyNtHJ0a3tqWyB5vKYhZ3IJd34IorrsC5c+eqLVu2QHFxsY5/amtro/LycuU4DqbTaVYUixiNqQy89eT3nC9MjKi8YFkVtkfM2vnhV5MsdS8fbMy2fZcMbVDpm0WWovrGNZP+ZfeHvz/hL6cS6PVPOHZg3+7Mpt/kVLHR4OWd3SaRSUqFOIGNQDZKMswRxlbJzeWeh9mv31wkH36u4F4y71Z7TPlgmF4xAzZv3swsy4KZM2cGVtu+fTtu3LiRzZ49G0zOIF2Q8PwP7/OWDM16RrgUPc9nyNBzuUkjoG1e2Gd3ex75BGjoAhVmTIUtYK5DL2qMNTUf5dG+OVshQ1AtDfvbprD7Hl5yR6vfmXM5R5cJ2cWVci3fFz4zspUt77VMzDUaeTAwEo7gndelnTe3b8Krr37QMgyEzs5OuOqqqyCXywUvnjx5Mqxfvx4MjtDeLeDph+71FhU1OAMSAzDnesCR6VC3GakmGeUxR6ICRhlFyJUiQI5U31gwsgX5Zz2gqcCtTyfQW43piMx5g6K+P8WVglB/W3+LG+AZnIywhW/YVRvLPnzlB0mW/27eIacsGYeqSbudx394Oy2+caVdmkgq4XsYDoWRgMD3PCgpLYUPDzXCa09811mcaHOHDBzANHiGOtUQ6Z5BMGpHAwaAhk9o6MSGOvURmKkuvx0AGrSSQfYWuVMJKCF1MunoPpLa57l+iULMBslMZyylIwFA5BwZM/js5yZ9PvXVnS/8MGTDd3IFkR48ZABbtiBTWP/Gt2SeXxzZ/5d6+OxnFwFDBr9+/XVoOXxQJdu3OzcNVX6suOwE+JPEhBRyqiA/aEuCP+oY8n1lNre5hwGgQwilMZ6RAFTXVAepNNPQvlfkvTncMpCoJ52d8DpErqTqLDLF4p9Ore64Z9fzT4TD9l0Fx09ZdlHx9Qulemfr+ifeXaemd2777SxJ4LHMMVV1oS3Hj4+TSwYreP4p4BGVJEkx7GYASUDwA1/QaZQh5RxlNDQ5H+pbNTXVGo88I4Gax1uDt3buO7bNSWWheHiShOsd75NOCAEYypNdURO/9MSkGx6+e8/q1fHS2M05V9SljsBzs53hFfMXwpRs3snq5yPhYeBKwpyva5I8XfNIDAjyFAMfCEqBQHfzQTdkW0gt7T4cPFzYrh99/PGPUiic1rPU1uqCBNmjqW3dR1Mumox/5G0ni0775PtpxtnyZ8YtblSZ/L87u6AmtA+/6CpZncoL9NEMrq6CQMeTwWFn7LcJDCDogmLiQBhDwEDDuoJzDryxxXWb2txtfbcRZyagq2bPHmZPur6tMfBKHUJnEUKGhpL5TDT+tV/K2XuibWI5WDBWKerUvZMOT33pV56q9D7giRBMIkixCEURoG8nqg1hNjQ5Gsse1oNNnYsA3S+kvpfpPHBsp591Q8jZSV84lQIh+JZSkWMThyxgSvxJ30XA/s8FqP1H9z7QimEWRwr8WwKg0iudgkvhPx/J79SYhLhfv/ecFoCVVVXBvbZt9RsKbRnklnEOGwS5l4OQXj4arjg2MLmNC6WblPOYjynomZWB7ZKzUeEQ50iQYEpGi5jvp1pymZ17cxv0k1VVK0/De/rwUVsbFLTuw+1vdx5szsfLB3LhuHrQPxsAndMKtpTjNs6qkEvX/a7ej9hDmdJteL9GTNJ50QS31RZCOa6ZKRjho+1mrLv7gpG5VzftHd7QXPeOjs3a2mBL+DEE9Cwmg1y7K7WnYe+F8ydPRUA9SJ/VLQgRDCGNhuFDp3qcbzYAlykAB3o7yrMJ6trD0GSe37lt4rgDf5w4vUgoJqRhfAokJa2IOaxJHTkAANuVCjCdRuCMoKqqqvTBonnroTedtm6TWcaJvHsWJIyIcgzokrrxow5yz8/p6Du+N+qphGfQFKAyCWI5w3jy91WXVtth+3YL5DUR4V4c43KQakmF2jbseU1j6cUE/SJQq9MpQ2jfUf+rVN1RYVpGBKTS7DWRM4IhQN9WauCWmZ8q4b6/17Z4HBBDgBAiBEsXQB3dfcZBHxnGjVz+f35x8+fMIikqvZyTIsCMIshi2JLtexqdtrrG1zQWjanfBDRQ7UawFN5v2rT/7Rxjzb5p2oyxElQUDrJcT7ZQfSKR0JdeLha9sjlWutbv9reRR7vIg7+AB83kUwYEeKAnZgUmAZZarpd6a97M9RS2bgNf6nWJpa0ZWMcT0eatB7cBwPsBlj7Vt6+cdYOAOmoRZANuWrUsJi5V185qqxs8aJQfDk01pBxjKlUCSgkdwAgshEgWGQoM3zscmuHpLrpOeZABQQIF+OSjIldRMBAKAEPyWLYLf79j2uR7or4XFwidqPEQgRG2VLq+zTjyu91rgpGyCjVOcV4EtFaDn0ZC9Gb3/mMP3/zmO4Wqgr+zqyz+zu5JY17fM250wguHZtrSHUfg7EfJd7juiPrLGjfvKQLnKWWFQsiV9hVdzSQgCCAmAEHP2C4xgKigEWWZjrey0ZJLmBLBHp8UEJrcbtq0ryl3rOtFPeBTrTprDJ6r4Kh/uI54Pg/HXt3f8WSDwCEqFv50cbbwtXl/3PGPdz39UtXyxx57EdODbqOWyt9By9UlmL7kiwUaOgPIzwtJXaTnaYI0SMwF7qMHVAEWCIyjC8Vo2Iu+fPC1SdIXP0bDKNZuyW1T5pu7IvVv7NDab71+zXU6eM9aV85ZMWtqdDtCuL8595MNBzpSYc5yHjN8xanI52r7a5etGCidmT/gEL8HmfwsMC/BmOrp/nR/07MM4EGzdjyAg/6CJDBSric7RSRafVfd2lBW4CrGsMQImezIH/Z0tO868rg+u6a65pxF8eNKvqquDkaIQ7+ua3uqI+/FEzK9Y39y2opHlrwIDRdctJyRO1yR6CKCNALzOdfpOpihP1YQwfAFpcEy77qj7qU/50OxN7x0Ln7w5fd+BoiHqquD9v4crcy5Y+AkKyDiYz9/r23SuAefeX8vDryzSOZHKSnSuvtD1JomVEQSlDxX63a6EKFgmCsi95vLUht/cN/zHcUddY2P9p75sXrozx5TIVZrvR55eb+35uqGzlUDRyfzbs7vQs5103lCggNVT7LomRT78XYEJKGUVRxm7Rt23L/3Z/tuZgwbe5ZbZ06dfaWfXWONvP7FF/mKXOuanU898isnlwtx09SNcB8cPf17MMIe36n1Q0hPRxaTmYwffX5d61uVKyrXvfDC9fzjXKfvuf0V3S5ouw6detMdmyru+MZAL6cXmaxngwYKHYz6s7Or/3uGu+4uDyOA/cCgCGRxlIeeWHW05dlXmi5nDJuU0km2fwTOZ5+vuymGnDfuWvOzW/a9ulqFiktNkvLEQZqgdiHsZwxIBaqkyDBr3mgRz77SdAvvAd9v7Z8vgeBMmjPHQMbe2fL4Q1/Yt26tacdLTSCSQbcYzFAiWGadayTo6URAavAvv9nKf/Tzw7cyhu/OUWT0x+//GgK60xM0d64BSr28+Uf3V9etfdrjph0zQ2FBSkkOEoP8cQYGGriSRGGbCdvA2POvNnkP/fTQDYjwq7lzyag9S7vwyRLoJQHz5hmA+OrWn/zHle898dCObHNj3CouMWIx09NLdUlIequmL1LaJKhCNlPFRYZ5tNktfeQXR3Y++mzDlYjw2rx5YNTWnj94+AR+pObImCSlIonhI/9p2GduvGnhkN1/Wlh+5AtWJJTnCD1tpP6R15Xm0WaHfbCr+/C6P7T+/HCj8zBjmO/1+fNym0+SgBaGjCvq6bcGl8bYkksqShcNHxqaUBQ1ynRYZ/Oi80iTs/dPu9K/TXWJlwCgRW8YzifbnE3+F0aDNAKd/fj9AAAAAElFTkSuQmCC";
const WORLD_JSON = JSON.stringify(WORLD);

export const DASHBOARD_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Dune Atlas usage</title>
<link rel="icon" type="image/png" sizes="32x32" href="data:image/png;base64,${ICON_PNG_BASE64}">
<style>
  body { margin: 0; background: #0d0f13; color: #e8e2d4; font: 14px/1.4 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  main { max-width: 1100px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 16px; margin: 0 0 8px; }
  .muted { color: #9a9488; font-size: 12.5px; }
  .ranges button { background: #1b1e25; color: #e8e2d4; border: 1px solid #333844; border-radius: 4px; padding: 4px 10px; margin-right: 4px; cursor: pointer; }
  .ranges button.on { background: #e8b25a; color: #14110d; border-color: #e8b25a; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin: 14px 0; }
  .tile { background: #161920; border: 1px solid #262a33; border-radius: 6px; padding: 10px 12px; }
  .tile b { display: block; font-size: 24px; color: #f2c879; }
  .card { background: #161920; border: 1px solid #262a33; border-radius: 6px; padding: 12px; margin: 12px 0; }
  .legend span { display: inline-block; margin-right: 12px; font-size: 12.5px; }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { text-align: right; padding: 4px 8px; border-bottom: 1px solid #262a33; } th:first-child, td:first-child { text-align: left; }
  svg text { fill: #9a9488; font-size: 11px; }
  a { color: #8cc0ff; }
  .geo { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 16px; align-items: start; }
  @media (max-width: 800px) { .geo { grid-template-columns: 1fr; } }
  .metric button { background: #1b1e25; color: #e8e2d4; border: 1px solid #333844; border-radius: 4px; padding: 3px 9px; margin: 0 4px 8px 0; cursor: pointer; font-size: 12.5px; }
  .metric button.on { background: #e8b25a; color: #14110d; border-color: #e8b25a; }
  #map path { stroke: #0d0f13; stroke-width: 0.4; }
</style></head><body><main>
<h1>Dune Atlas usage</h1>
<p class="muted" id="status">Loading…</p>
<div class="ranges" id="ranges"></div>
<div class="tiles" id="tiles"></div>
<div class="card"><h2>Visits per day</h2><div class="legend" id="lg-visits"></div><div id="c-visits"></div>
  <p class="muted">Cloudflare Web Analytics: a visit is a page view arriving from another site or a direct link. Counted from 15 October 2026.</p></div>
<div class="card"><h2>Downloads (cumulative over the range)</h2><div class="legend" id="lg-dl"></div><div id="c-dl"></div>
  <p class="muted">Counted by the atlas when a file is saved or text is copied. Visitors whose browser blocks the message are not counted.</p></div>
<div class="card"><h2>Data served per day (GB)</h2><div id="c-gb"></div>
  <p class="muted">All bytes sent by data.geomorphlab.org (map tiles and data for the page, scripts and bots included); some days are Cloudflare's sampled estimates.</p></div>
<div class="card"><h2>Unique IP addresses per day</h2><div id="c-ip"></div>
  <p class="muted">Whole geomorphlab.org domain as seen by Cloudflare (data host and lab website; the atlas pages themselves are served by GitHub). Not the number of atlas users.</p></div>
<div class="card"><h2>By country</h2><div class="metric" id="metric"></div>
  <div class="geo"><div><div id="map"></div><div id="cbar"></div></div><div id="bars"></div></div>
  <p class="muted">Countries come from Cloudflare (the visitor's network location; VPN users appear in the VPN's country). Grey: none in this range. Colours on a logarithmic scale.</p></div>
<p class="muted"><a id="csv" href="#">Download the CSV</a> · all figures are daily totals by country; no IP addresses or identifiers are kept.</p>
</main>
<script>
(function () {
  var key = new URLSearchParams(location.search).get("key") || "";
  document.getElementById("csv").href = "/usage.csv?key=" + encodeURIComponent(key);
  var COLORS = ["#e8b25a", "#7fb3e6", "#9bd18b", "#e07a6b", "#c39be0", "#6fd0c4", "#d9d36a", "#b0a99a"];
  var TYPE_NAMES = { "map-image": "Map images", "region": "Region boxes", "cell-netcdf": "Cell NetCDF", "cell-csv": "Cell CSV", "citation": "Citations", "plot": "Plots", "copy-code": "Copy code", "copy-citation": "Copy citation" };
  var COUNTRY = (function () { try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) { return null; } })();
  function cname(c) { if (!c || c === "all") return "All"; if (c === "XX" || c === "T1") return c; try { return (COUNTRY && COUNTRY.of(c)) || c; } catch (e) { return c; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  function fmt(n, d) { return Number(n).toLocaleString("en-GB", { maximumFractionDigits: d == null ? 0 : d }); }
  function parse(text) {
    var lines = text.trim().split(/\\r?\\n/), head = lines.shift().split(",");
    return lines.map(function (l) { var v = l.split(","), o = {}; head.forEach(function (h, i) { o[h] = v[i]; }); o.value = Number(o.value); return o; })
      .filter(function (r) { return r.source !== "counter-preview" && r.date; });
  }
  function days(from, to) { var out = [], d = new Date(from + "T00:00:00Z"), e = new Date(to + "T00:00:00Z"); while (d <= e) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); } return out; }
  function chart(el, xs, series, o) {
    o = o || {}; var W = 1040, H = 220, L = 50, R = 10, T = 10, B = 24, w = W - L - R, h = H - T - B;
    var max = 0; series.forEach(function (s) { s.ys.forEach(function (y) { if (y > max) max = y; }); }); if (!(max > 0)) max = 1;
    var X = function (i) { return L + (xs.length < 2 ? w / 2 : (i * w) / (xs.length - 1)); }, Y = function (v) { return T + h - (v / max) * h; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img">';
    for (var g = 0; g <= 4; g++) { var v = (max * g) / 4, y = Y(v); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="#262a33"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + fmt(v, max < 10 ? 1 : 0) + '</text>'; }
    var step = Math.max(1, Math.ceil(xs.length / 8));
    xs.forEach(function (x, i) { if (i % step === 0 || i === xs.length - 1) s += '<text x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + x.slice(5) + '</text>'; });
    series.forEach(function (sr) {
      if (o.bars) { var bw = Math.max(1, w / xs.length - 2); sr.ys.forEach(function (v, i) { s += '<rect x="' + (X(i) - bw / 2) + '" y="' + Y(v) + '" width="' + bw + '" height="' + (T + h - Y(v)) + '" fill="' + sr.color + '"><title>' + xs[i] + ': ' + fmt(v, 2) + '</title></rect>'; }); }
      else { s += '<polyline fill="none" stroke="' + sr.color + '" stroke-width="2" points="' + sr.ys.map(function (v, i) { return X(i) + "," + Y(v); }).join(" ") + '"/>'; }
    });
    el.innerHTML = s + "</svg>";
  }
  var WORLD = ${WORLD_JSON};
  var METRICS = [["visits", "Visits", 0], ["downloads", "Downloads", 0], ["gb", "Data served (GB)", 2]], metric = "visits", lastBy = {};
  function ramp(t) { var a = [74, 58, 34], b = [232, 178, 90], c = [255, 242, 200], m = t < 0.6 ? [a, b, t / 0.6] : [b, c, (t - 0.6) / 0.4];
    return "rgb(" + [0, 1, 2].map(function (i) { return Math.round(m[0][i] + (m[1][i] - m[0][i]) * m[2]); }).join(",") + ")"; }
  function geo(by) {
    lastBy = by;
    var mEl = document.getElementById("metric");
    mEl.innerHTML = METRICS.map(function (m) { return '<button data-m="' + m[0] + '"' + (m[0] === metric ? ' class="on"' : "") + ">" + m[1] + "</button>"; }).join("");
    var spec = METRICS.filter(function (m) { return m[0] === metric; })[0];
    var vals = Object.keys(by).map(function (k) { return [k, by[k][metric]]; }).filter(function (e) { return e[1] > 0; }).sort(function (a, b) { return b[1] - a[1]; });
    var max = vals.length ? vals[0][1] : 1, lmax = Math.log10(max + 1) || 1;
    var col = function (v) { return v > 0 ? ramp(Math.log10(v + 1) / lmax) : "#2a2e38"; };
    var s = '<svg viewBox="0 0 1000 394.4" width="100%" role="img" aria-label="World map">';
    Object.keys(WORLD).forEach(function (k) { var v = by[k] ? by[k][metric] : 0;
      s += '<path d="' + WORLD[k] + '" fill="' + col(v) + '"><title>' + esc(cname(k)) + ": " + fmt(v, spec[2]) + "</title></path>"; });
    document.getElementById("map").innerHTML = s + "</svg>";
    var stops = []; for (var i = 0; i <= 10; i++) stops.push('<stop offset="' + i * 10 + '%" stop-color="' + ramp(i / 10) + '"/>');
    var ticks = [0, 0.25, 0.5, 0.75, 1].map(function (t) { var v = Math.pow(10, t * lmax) - 1; return '<text x="' + (10 + t * 380) + '" y="34" text-anchor="middle">' + fmt(v, max < 10 ? spec[2] || 1 : 0) + "</text>"; }).join("");
    document.getElementById("cbar").innerHTML = '<svg viewBox="0 0 400 40" width="60%" style="min-width:260px"><defs><linearGradient id="g">' + stops.join("") + '</linearGradient></defs><rect x="10" y="6" width="380" height="12" fill="url(#g)" rx="2"/>' + ticks + "</svg>";
    var top = vals.slice(0, 15), bw = 260, rowH = 20, H2 = top.length * rowH + 4, b = '<svg viewBox="0 0 420 ' + Math.max(H2, 24) + '" width="100%" role="img" aria-label="Countries ranked">';
    if (!top.length) b += '<text x="0" y="16">None in this range</text>';
    top.forEach(function (e, i) { var y = i * rowH + 2, w = (e[1] / max) * bw;
      b += '<text x="120" y="' + (y + 13) + '" text-anchor="end" style="fill:#e8e2d4">' + esc(cname(e[0]).slice(0, 20)) + '</text><rect x="126" y="' + (y + 3) + '" width="' + Math.max(w, 1) + '" height="13" fill="' + col(e[1]) + '" rx="2"/><text x="' + (130 + w) + '" y="' + (y + 13) + '">' + fmt(e[1], spec[2]) + "</text>"; });
    document.getElementById("bars").innerHTML = b + "</svg>";
  }
  document.addEventListener("click", function (e) { var t = e.target.closest && e.target.closest("#metric button"); if (t) { metric = t.getAttribute("data-m"); geo(lastBy); } });
  function legend(el, series) { el.innerHTML = series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + "</span>"; }).join(""); }
  function render(rows, range) {
    var all = rows.map(function (r) { return r.date; }).sort(), first = all[0], last = all[all.length - 1];
    var start = first;
    if (range !== "all") { var d = new Date(last + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - Number(range) + 1); var s0 = d.toISOString().slice(0, 10); if (s0 > first) start = s0; }
    var xs = days(start, last), R = rows.filter(function (r) { return r.date >= start; });
    var sum = function (f) { return R.filter(f).reduce(function (a, r) { return a + r.value; }, 0); };
    var perDay = function (f) { var m = {}; R.filter(f).forEach(function (r) { m[r.date] = (m[r.date] || 0) + r.value; }); return xs.map(function (x) { return m[x] || 0; }); };
    var isCount = function (r) { return r.measure.indexOf("export_count:") === 0; };
    var ipDays = R.filter(function (r) { return r.measure === "unique_ips_zone"; });
    document.getElementById("tiles").innerHTML = [
      ["Visits", fmt(sum(function (r) { return r.measure === "visits"; }))],
      ["Page views", fmt(sum(function (r) { return r.measure === "page_views"; }))],
      ["Downloads", fmt(sum(isCount))],
      ["Downloaded files (GB)", fmt(sum(function (r) { return r.measure.indexOf("export_bytes:") === 0; }) / 1e9, 2)],
      ["Data served (GB)", fmt(sum(function (r) { return r.measure === "data_host_bytes"; }) / 1e9, 1)],
      ["Unique IPs per day (domain, mean)", ipDays.length ? fmt(ipDays.reduce(function (a, r) { return a + r.value; }, 0) / ipDays.length) : "–"],
    ].map(function (t) { return '<div class="tile"><span class="muted">' + t[0] + "</span><b>" + t[1] + "</b></div>"; }).join("");
    var vis = [["earth", "Earth", COLORS[0]], ["mars", "Mars", COLORS[3]]].map(function (b) { return { name: b[1], color: b[2], ys: perDay(function (r) { return r.measure === "visits" && r.body === b[0]; }) }; });
    var visAll = perDay(function (r) { return r.measure === "visits"; });
    if (vis[0].ys.concat(vis[1].ys).every(function (v) { return v === 0; }) && visAll.some(function (v) { return v > 0; })) vis = [{ name: "All", color: COLORS[0], ys: visAll }];
    legend(document.getElementById("lg-visits"), vis); chart(document.getElementById("c-visits"), xs, vis);
    var types = Object.keys(TYPE_NAMES).filter(function (t) { return R.some(function (r) { return r.measure === "export_count:" + t; }); });
    var dl = types.map(function (t, i) { var c = 0; return { name: TYPE_NAMES[t], color: COLORS[i % COLORS.length], ys: perDay(function (r) { return r.measure === "export_count:" + t; }).map(function (v) { return (c += v); }) }; });
    legend(document.getElementById("lg-dl"), dl.length ? dl : [{ name: "No downloads in this range", color: "#333844" }]);
    chart(document.getElementById("c-dl"), xs, dl);
    chart(document.getElementById("c-gb"), xs, [{ name: "GB", color: COLORS[1], ys: perDay(function (r) { return r.measure === "data_host_bytes"; }).map(function (v) { return v / 1e9; }) }], { bars: true });
    chart(document.getElementById("c-ip"), xs, [{ name: "IPs", color: COLORS[2], ys: perDay(function (r) { return r.measure === "unique_ips_zone"; }) }]);
    var by = {};
    R.forEach(function (r) { if (r.country === "all") return; var c = by[r.country] || (by[r.country] = { visits: 0, downloads: 0, gb: 0 });
      if (r.measure === "visits") c.visits += r.value; else if (isCount(r)) c.downloads += r.value; else if (r.measure === "data_host_bytes") c.gb += r.value / 1e9; });
    geo(by);
    document.getElementById("status").textContent = "Daily figures from " + start + " to " + last + " (UTC). Updated every day at 03:17 UTC; downloads are added as they happen.";
  }
  fetch("/usage.csv?key=" + encodeURIComponent(key)).then(function (r) { if (!r.ok) throw new Error(r.status === 403 ? "The key is missing or wrong." : "Could not load the figures (" + r.status + ")."); return r.text(); })
    .then(function (text) {
      var rows = parse(text);
      if (!rows.length) { document.getElementById("status").textContent = "No figures yet."; return; }
      var ranges = [["30", "30 days"], ["90", "90 days"], ["365", "1 year"], ["all", "All"]], cur = "90";
      var el = document.getElementById("ranges");
      var draw = function () { el.innerHTML = ranges.map(function (r) { return '<button data-r="' + r[0] + '"' + (r[0] === cur ? ' class="on"' : "") + ">" + r[1] + "</button>"; }).join(""); render(rows, cur); };
      el.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { cur = b.getAttribute("data-r"); draw(); } });
      draw();
    }).catch(function (e) { document.getElementById("status").textContent = e.message; });
})();
</script></body></html>`;
